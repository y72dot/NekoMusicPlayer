declare module 'jsbn' {
  export class BigInteger {
    constructor(value: string, radix?: number)
    modPow(exponent: BigInteger, modulus: BigInteger): BigInteger
    toString(radix?: number): string
  }
}
