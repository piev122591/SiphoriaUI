import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-upload-images',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-images.component.html',
})
export class UploadImagesComponent {

  private storage = inject(Storage);

  selectedFile: File | null = null;
  imageUrl: string | null = null;
  isUploading = false;
  errorMessage: string | null = null;
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

 async uploadImage() {
  if (!this.selectedFile || this.isUploading) return;

  this.isUploading = true;
  this.errorMessage = null;

  try {
    const filePath = `products/${Date.now()}-${this.selectedFile.name}`;
    const storageRef = ref(this.storage, filePath);

    await uploadBytes(storageRef, this.selectedFile);
    const downloadURL = await getDownloadURL(storageRef);

    this.imageUrl = downloadURL;

    console.log("Uploaded Image URL:", downloadURL);

  } catch (error: any) {

    console.error("Upload failed:", error);

    this.errorMessage = "Upload failed. Please try again.";
    this.imageUrl = null;

  } finally {
    this.isUploading = false; // 🔥 Always stop loading
  }
}
}