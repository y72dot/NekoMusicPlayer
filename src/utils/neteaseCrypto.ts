import CryptoJS from 'crypto-js'
import { BigInteger } from 'jsbn'

const FIRST_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const RSA_PUB_KEY = '010001'
const RSA_MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'

function aesEncrypt(text: string, key: string): string {
  const keyWordArray = CryptoJS.enc.Utf8.parse(key)
  const ivWordArray = CryptoJS.enc.Utf8.parse(IV)
  const encrypted = CryptoJS.AES.encrypt(text, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.toString()
}

function rsaEncrypt(text: string): string {
  let hex = ''
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(2, '0')
  }
  const biText = new BigInteger(hex, 16)
  const biExp = new BigInteger(RSA_PUB_KEY, 16)
  const biMod = new BigInteger(RSA_MODULUS, 16)
  const result = biText.modPow(biExp, biMod)
  return result.toString(16).padStart(256, '0')
}

function randomKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  let key = ''
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(array[i] % chars.length)
  }
  return key
}

export function sign(body: Record<string, unknown>): { params: string; encSecKey: string } {
  const json = JSON.stringify(body)
  const firstEncrypt = aesEncrypt(json, FIRST_KEY)
  const secondKey = randomKey()
  const params = aesEncrypt(firstEncrypt, secondKey)
  const reversedKey = secondKey.split('').reverse().join('')
  const encSecKey = rsaEncrypt(reversedKey)
  return { params, encSecKey }
}
