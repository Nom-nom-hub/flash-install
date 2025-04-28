import * as _ from 'lodash';

export function greet(name: string): string {
  return `Hello, ${_.capitalize(name)}!`;
}

export function sum(numbers: number[]): number {
  return _.sum(numbers);
}
