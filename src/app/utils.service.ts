import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UtilsService {

    constructor() {
        // ---
    }

    public byteArrToInt16(arr: number[]): number {
        let val = 0x0000;
        val = arr[1];
        val <<= 8;
        val |= arr[0];
        return val;
    }

    public byteArrToInt32(arr: number[]): number {
        let val = 0x00000000;
        val = arr[3];
        val <<= 8;
        val |= arr[2];
        val <<= 8;
        val |= arr[1];
        val <<= 8;
        val |= arr[0];
        return val;
    }

    public int32ToByteArr(int32: number): number[] {
        let arr = [];
        arr[0] = (int32 & 0x000000FF) >> 0;
        arr[1] = (int32 & 0x0000FF00) >> 8;
        arr[2] = (int32 & 0x00FF0000) >> 16;
        arr[3] = (int32 & 0xFF000000) >>> 24;
        return arr;
    }

    public int16ToByteArr(int16: number): number[] {
        let arr = [];
        arr[0] = (int16 & 0x00FF) >> 0;
        arr[1] = (int16 & 0xFF00) >>> 8;
        return arr;
    }

    public dateFromByteArray(byteArr: number[]): Date {
        let zbDate = new Date();
        let zbTime = this.byteArrToInt32(byteArr);
        let mSec = zbTime * 1000 + Date.UTC(2000, 0, 1);
        zbDate.setTime(mSec);
        return zbDate;
    }

    public dateToByteArray(newDate: Date) {
        let secFrom1970: number = newDate.getTime() / 1000;
        let secFrom2000: number = Date.UTC(2000, 0, 1) / 1000;
        let zbTime: number = secFrom1970 - secFrom2000;
        return this.int32ToByteArr(zbTime);
    }

    public strToByteArr(str: string): number[] {
        let len = str.length;
        let strVal = str;
        let arr = [];
        arr[0] = len;
        for (let i = 0; i < len; i++) {
            arr.push(strVal.charCodeAt(i));
        }
        return arr;
    }

    public byteArrToStr(arr: number[]): string {
        let len = arr[0];
        let charArr = arr.slice(1, (len + 1));
        return String.fromCharCode.apply(String, charArr);
    }

    public ipFromLong(ipLong: number): string {
        let ip = `${((ipLong >>> 24) & 0xFF)}`;
        ip += `.${((ipLong >> 16) & 0xFF)}`;
        ip += `.${((ipLong >> 8) & 0xFF)}`;
        ip += `.${(ipLong & 0xFF)}`;
        return ip;
    }

    public ipToLong(ip: string): number {
        let ipl = 0;
        ip.split('.').forEach(function(octet) {
            ipl <<= 8;
            ipl += parseInt(octet);
        });
        return(ipl >>> 0);
    }

    public arrayBufToBuf(arrayBuf: ArrayBuffer){
        let buf = window.nw.Buffer.alloc(arrayBuf.byteLength);
        let view = new Uint8Array(arrayBuf);
        for(let i = 0; i < buf.length; i++) {
            buf[i] = view[i];
        }
        return buf;
    }

    public bufToArrayBuf(buf: any) {
        let arrayBuf = new ArrayBuffer(buf.length);
        let view = new Uint8Array(arrayBuf);
        for (let i = 0; i < buf.length; i++) {
            view[i] = buf[i];
        }
        return arrayBuf;
    }

    public timeStamp() {
        const now = new Date();
        const hours = now.getHours().toString(10).padStart(2, '0');
        const minutes = now.getMinutes().toString(10).padStart(2, '0');
        const seconds = now.getSeconds().toString(10).padStart(2, '0');
        return `<${hours}:${minutes}:${seconds}>`;
    }
}

