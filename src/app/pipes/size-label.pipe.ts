import { Pipe, PipeTransform } from '@angular/core';

/** Appends " oz" to a bare size ("16" -> "16 oz") but leaves already-descriptive
 *  size labels ("16 oz (Cold)") untouched instead of doubling up the unit. */
@Pipe({
  name: 'sizeLabel',
  standalone: true
})
export class SizeLabelPipe implements PipeTransform {
  transform(size: string | number | null | undefined): string {
    if (size === null || size === undefined || size === '') return '';
    const str = String(size).trim();
    return /oz\b/i.test(str) ? str : `${str} oz`;
  }
}
