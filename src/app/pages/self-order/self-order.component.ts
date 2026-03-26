import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { ProductModalComponent } from './product-modal/product-modal.component';

@Component({
  selector: 'app-self-order',
  standalone: true,
  imports: [CommonModule,ProductModalComponent],
  templateUrl: './self-order.component.html',
  styleUrls: ['./self-order.component.css']
})
export class SelfOrderComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  productDetails: any[] =[];
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService
  ) {}
  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadProductDetails();
  }

  loadCategories(){
      this.categoryService.getCategories().subscribe(res => {
      this.categories = res;
      console.log(this.categories);
    });
  }

  loadProductDetails(){
    this.productService.getProductDetails().subscribe(res => {
      this.productDetails = res;
      console.log(this.productDetails);

       console.log("list products from productDetails");
    });

  }

  loadProducts() {
    this.productService.getProducts().subscribe(res => {
      this.products = res;
      console.log(this.products);

       console.log("list products");
    });


  }
  step = 2;

  selectedCategoryId: number | null = null;
  selectedCategory: string | null = null;

// products = [
//   { id: 1, name: 'Ube Latte', price: 120, category: 1, image: 'products/signatureCoffee/UbeLatte.jpg' },
//   { id: 2, name: 'Raspberry Latte', price: 120, category: 1, image: 'products/signatureCoffee/RaspberryLatte.jpg' },
//   { id: 3, name: 'Americano', price: 110, category: 2, image: 'products/classicCoffe/SpanishLatte.jpg' },
//   { id: 4, name: 'Spanish Latte', price: 130, category: 3, image: 'assets/spanish.jpg' },
//   { id: 5, name: 'Matcha Latte', price: 140, category: 4, image: 'products/matchaSeries/MatchaLatte.jpg' },
//   { id: 6, name: 'Dirty Matcha', price: 140, category: 4, image: 'products/matchaSeries/DirtyMatcha.jpg' },
//   { id: 7, name: 'Strawberry Matcha', price: 140, category: 4, image: 'products/matchaSeries/StrawberryMatcha.jpg' }
// ];

  selectedProduct: any = null;


  selectedProductListWithSizes: any [] = [];

  cart: any[] = [];

  get filteredProducts() {
    return this.products.filter(
      p => p.categoryid === this.selectedCategoryId
    );
  }

  next() {
    this.step++;
  }

  back() {
    this.step--;
  }

selectCategory(category: any) {
  this.selectedCategory = category.name;
  this.selectedCategoryId = category.id;
  this.step = 3;
}


 addToCart(product: any) {
 console.log("cart");
  console.log(product);
  const exist = this.cart.find(i => i.id === product.id);

  if (exist) {
    exist.qty += product.qty; // ✅ use modal qty
  } else {
    this.cart.push(product);
  }
}



  placeOrder() {

    alert('Order placed!');

    console.log(this.cart);

    this.cart = [];
    this.step = 1;

  }




  increaseQty(product: any) {

  const item = this.cart.find(x => x.id === product.id);

  if (item) {
    item.qty++;
  } else {
    this.cart.push({
      ...product,
      qty: 1
    });
  }

}


decreaseQty(product: any) {

  const item = this.cart.find(x => x.id === product.id);

  if (!item) return;

  item.qty--;

  if (item.qty <= 0) {
    this.cart = this.cart.filter(x => x.id !== product.id);
  }

}


filteredProductsWithSizes(productId: number): any[] {
  return this.productDetails.filter(p => p.productId === productId);
}

openProductModal(product: any) {
  this.selectedProductListWithSizes = this.filteredProductsWithSizes(product.id);
  this.selectedProduct = product;

  console.log(this.filteredProducts); // check result
}

closeModal() {
  this.selectedProduct = null;
}


addToCartFromModal() {
  this.addToCart(this.selectedProduct);
  this.closeModal();
}

getQty(product: any) {

  const item = this.cart.find(x => x.id === product.id);
  return item ? item.qty : 0;

}

getTotalItems() {
  return this.cart.reduce((total, item) => total + item.qty, 0);
}


removeItem(item:any){
this.cart = this.cart.filter(i => i !== item);
}

getCartTotal(){
return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
}
goBack() {

  if (this.step === 3) {
    this.step = 2;
  }
  else if (this.step === 4) {
    this.step = 3;
  }
  else if (this.step === 5) {
    this.step = 3;
  }

}
}