import { Injectable } from '@angular/core';
import { EventsService } from './events.service';
import { GlobalsService } from './globals.service';
import { UtilsService } from './utils.service';
import * as gIF from './gIF';

enum eRxState {
    E_STATE_RX_WAIT_START,
    E_STATE_RX_WAIT_TYPELSB,
    E_STATE_RX_WAIT_TYPEMSB,
    E_STATE_RX_WAIT_LENLSB,
    E_STATE_RX_WAIT_LENMSB,
    E_STATE_RX_WAIT_CRC,
    E_STATE_RX_WAIT_DATA,
}
const SL_START_CHAR = 0x01;
const SL_ESC_CHAR = 0x02;
const SL_END_CHAR = 0x03;

const SERIAL_TEST_PORT = 0x0001;
const SERIAL_SET_THERMOSTAT = 0x0002;
const SERIAL_GET_THERMOSTAT = 0x0003;
const SERIAL_CHECK_DEVICE = 0x0004;
const SERIAL_DBG_LOG = 0x0005;

export interface rdKeys_t {
    status: number;
    nwkKey: string;
    panId: number;
}

export interface slMsg_t {
    type: number;
    data: number[];
}

//const BE = false;
const LE = true;
const HEAD_LEN = 5;
const LEN_IDX = 2;
const CRC_IDX = 4;

const CHECK_DEVICE_INTERVAL = 3000;
const VALID_PORT_TMO = 8000;

@Injectable({
    providedIn: 'root',
})
export class SerialService {

    validPortFlag = false;
    private searchPortFlag = false;
    private portOpenFlag = false;
    private portIdx = 0;

    private testPortTMO = null;
    private validPortTMO = null;

    private crc = 0;
    private calcCRC = 0;
    private msgIdx = 0;
    private isEsc = false;
    private rxBuf = new ArrayBuffer(256);
    private rxMsg = new Uint8Array(this.rxBuf);
    private rxState = eRxState.E_STATE_RX_WAIT_START;

    private msgType = 0;
    private msgLen = 0;

    private slPort: any = {};
    private comPorts = [];
    private SerialPort: any;
    private portPath = '';

    //trash: any;


    constructor(private events: EventsService,
                private globals: GlobalsService,
                private utils: UtilsService) {
        this.SerialPort = window.nw.require('chrome-apps-serialport').SerialPort;
    }

    /***********************************************************************************************
     * fn          listComPorts
     *
     * brief
     *
     */
    public listComPorts() {

        if(this.searchPortFlag == true){
            return;
        }
        this.SerialPort.list().then((ports)=>{
            this.comPorts = ports;
            if(ports.length) {
                this.searchPortFlag = true;
                this.portIdx = 0;
                setTimeout(()=>{
                    this.findComPort();
                }, 100);
            }
            else {
                this.searchPortFlag = false;
                setTimeout(()=>{
                    this.listComPorts();
                }, 1000);
                console.log('no com ports');
            }
        });
    }

    /***********************************************************************************************
     * fn          findComPort
     *
     * brief
     *
     */
    private findComPort() {

        if(this.searchPortFlag == false){
            setTimeout(() => {
                this.listComPorts();
            }, 1000);
            return;
        }
        this.portPath = this.comPorts[this.portIdx].path;
        console.log('testing: ', this.portPath);
        let portOpt = {
            baudrate: 115200,
            autoOpen: false,
        };
        this.slPort = new this.SerialPort(this.portPath, portOpt);
        this.portIdx++;
        if(this.portIdx >= this.comPorts.length) {
            this.searchPortFlag = false;
        }
        this.slPort.on('open', ()=>{
            this.portOpenFlag = true;
            this.testPortTMO = setTimeout(()=>{
                this.slPort.close();
            }, 2000);
            this.testPortReq();
            // ---
        });
        this.slPort.on('close', ()=>{
            this.portOpenFlag = false;
            this.validPortFlag = false;
            setTimeout(() => {
                this.findComPort();
            }, 100);
        });
        this.slPort.on('data', (data: any)=>{
            this.slOnData(data);
        });
        this.slPort.on('error', (err: any)=>{
            if(this.portOpenFlag == true){
                this.slPort.close();
            }
            else {
                setTimeout(() => {
                    this.findComPort();
                }, 100);
            }
            console.log(err);
        });

        this.slPort.open();
    }

    /***********************************************************************************************
     * fn          closePort
     *
     * brief
     *
     */
    closePort() {
        this.slPort.close();
    }

    /***********************************************************************************************
     * fn          processMsg
     *
     * brief
     *
     */
    private processMsg(msg: slMsg_t) {

        let msgData = new Uint8Array(msg.data);
        switch(msg.type) {
            case SERIAL_TEST_PORT: {
                let slMsg = new DataView(msgData.buffer);
                let idNum = 0;
                let msgIdx = 0;
                idNum = slMsg.getUint32(msgIdx, LE);
                msgIdx += 4;
                if(idNum === 0x67190110) {
                    clearTimeout(this.testPortTMO);
                    this.validPortFlag = true;
                    this.searchPortFlag = false;
                    setTimeout(()=>{
                        this.checkDevice();
                    }, CHECK_DEVICE_INTERVAL);
                    clearTimeout(this.validPortTMO);
                    this.validPortTMO = setTimeout(()=>{
                        this.slPort.close();
                    }, VALID_PORT_TMO);
                    console.log(`valid device on ${this.portPath}`);
                }
                break;
            }
            case SERIAL_GET_THERMOSTAT: {
                let slMsg = new DataView(msgData.buffer);
                let msgIdx = 0;
                const tsSet = {} as gIF.tsSet_t;
                tsSet.runFlag = slMsg.getUint8(msgIdx++);
                tsSet.tcTemp = slMsg.getUint16(msgIdx, LE) / 4.0;
                msgIdx += 2;
                tsSet.setPoint = slMsg.getUint16(msgIdx, LE) / 4.0;
                msgIdx += 2;
                tsSet.hist = slMsg.getUint8(msgIdx++) / 4.0;
                tsSet.duty = slMsg.getUint8(msgIdx++);

                this.events.publish('newTS', tsSet);
                break;
            }
            case SERIAL_CHECK_DEVICE: {
                let slMsg = new DataView(msgData.buffer);
                let dummy = 0;
                let msgIdx = 0;
                dummy = slMsg.getUint16(msgIdx, LE);
                msgIdx += 2;
                if(dummy === 0xACDC) {
                    setTimeout(()=>{
                        this.checkDevice();
                    }, CHECK_DEVICE_INTERVAL);
                    clearTimeout(this.validPortTMO);
                    this.validPortTMO = setTimeout(()=>{
                        this.slPort.close();
                    }, VALID_PORT_TMO);
                }
                break;
            }
            case SERIAL_DBG_LOG: {
                let log_msg = String.fromCharCode.apply(null, msgData);
                console.log(log_msg);
                break;
            }
        }
    }

    /***********************************************************************************************
     * fn          slOnData
     *
     * brief
     *
     */
    private slOnData(msg) {

        let pkt = new Uint8Array(msg);

        for(let i = 0; i < pkt.length; i++) {
            let rxByte = pkt[i];
            switch(rxByte) {
                case SL_START_CHAR: {
                    this.msgIdx = 0;
                    this.isEsc = false;
                    this.rxState = eRxState.E_STATE_RX_WAIT_TYPELSB;
                    break;
                }
                case SL_ESC_CHAR: {
                    this.isEsc = true;
                    break;
                }
                case SL_END_CHAR: {
                    if(this.crc == this.calcCRC) {
                        let slMsg: slMsg_t = {
                            type: this.msgType,
                            data: Array.from(this.rxMsg).slice(0, this.msgIdx),
                        };
                        setTimeout(()=>{
                            this.processMsg(slMsg);
                        }, 0);
                    }
                    this.rxState = eRxState.E_STATE_RX_WAIT_START;
                    break;
                }
                default: {
                    if(this.isEsc == true) {
                        rxByte ^= 0x10;
                        this.isEsc = false;
                    }
                    switch(this.rxState) {
                        case eRxState.E_STATE_RX_WAIT_START: {
                            // ---
                            break;
                        }
                        case eRxState.E_STATE_RX_WAIT_TYPELSB: {
                            this.msgType = rxByte;
                            this.rxState = eRxState.E_STATE_RX_WAIT_TYPEMSB;
                            this.calcCRC = rxByte;
                            break;
                        }
                        case eRxState.E_STATE_RX_WAIT_TYPEMSB: {
                            this.msgType += rxByte << 8;
                            this.rxState = eRxState.E_STATE_RX_WAIT_LENLSB;
                            this.calcCRC ^= rxByte;
                            break;
                        }
                        case eRxState.E_STATE_RX_WAIT_LENLSB: {
                            this.msgLen = rxByte;
                            this.rxState = eRxState.E_STATE_RX_WAIT_LENMSB;
                            this.calcCRC ^= rxByte;
                            break;
                        }
                        case eRxState.E_STATE_RX_WAIT_LENMSB: {
                            this.msgLen += rxByte << 8;
                            this.rxState = eRxState.E_STATE_RX_WAIT_CRC;
                            this.calcCRC ^= rxByte;
                            break;
                        }
                        case eRxState.E_STATE_RX_WAIT_CRC: {
                            this.crc = rxByte;
                            this.rxState = eRxState.E_STATE_RX_WAIT_DATA;
                            break;
                        }
                        case eRxState.E_STATE_RX_WAIT_DATA: {
                            if(this.msgIdx < this.msgLen) {
                                this.rxMsg[this.msgIdx++] = rxByte;
                                this.calcCRC ^= rxByte;
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    /***********************************************************************************************
     * fn          setPortTMO
     *
     * brief
     *
     *
    private setPortTMO() {
        setTimeout(()=>{
            this.checkDevice();
        }, 5000);
        clearTimeout(this.validPortTMO);
        this.validPortTMO = setTimeout(()=>{
            this.slPort.close();
        }, 12000);
    }
    */

    /***********************************************************************************************
     * fn          testPortReq
     *
     * brief
     *
     */
    private testPortReq() {

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;
        let msgIdx: number;

        msgIdx = 0;
        pktView.setUint16(msgIdx, SERIAL_TEST_PORT, LE);
        msgIdx += 2;
        msgIdx += 2 + 1; // len + crc
        // cmd data
        pktView.setUint32(msgIdx, 0x67190110, LE);
        msgIdx += 4;
        let msgLen = msgIdx;
        let dataLen = msgLen - HEAD_LEN;
        pktView.setUint16(LEN_IDX, dataLen, LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++) {
            crc ^= pktData[i];
        }
        pktView.setUint8(CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10) {
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, 'utf8', ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          getThermostat
     *
     * brief
     *
     */
    getThermostat() {

        if(this.validPortFlag == false){
            return;
        }

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;
        let msgIdx: number;

        msgIdx = 0;
        pktView.setUint16(msgIdx, SERIAL_GET_THERMOSTAT, LE);
        msgIdx += 2;
        msgIdx += 2 + 1; // len + crc
        // cmd data
        // ---
        let msgLen = msgIdx;
        let dataLen = msgLen - HEAD_LEN;
        pktView.setUint16(LEN_IDX, dataLen, LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++) {
            crc ^= pktData[i];
        }
        pktView.setUint8(CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10) {
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, 'utf8', ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          setThermostat
     *
     * brief
     *
     */
    setThermostat(tsSet: gIF.tsSet_t) {

        if(this.validPortFlag == false){
            return;
        }

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;
        let msgIdx: number;

        msgIdx = 0;
        pktView.setUint16(msgIdx, SERIAL_SET_THERMOSTAT, LE);
        msgIdx += 2;
        msgIdx += 2 + 1; // len + crc
        // cmd data
        pktView.setUint8(msgIdx++, tsSet.runFlag);
        pktView.setUint16(msgIdx, tsSet.setPoint, LE);
        msgIdx += 2;
        pktView.setUint8(msgIdx++, tsSet.hist);
        pktView.setUint8(msgIdx++, tsSet.duty);

        let msgLen = msgIdx;
        let dataLen = msgLen - HEAD_LEN;
        pktView.setUint16(LEN_IDX, dataLen, LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++) {
            crc ^= pktData[i];
        }
        pktView.setUint8(CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10) {
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, 'utf8', ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          checkDevice
     *
     * brief
     *
     */
    checkDevice() {

        if(this.validPortFlag == false){
            return;
        }

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;
        let msgIdx: number;

        //this.seqNum = ++this.seqNum % 256;
        msgIdx = 0;
        pktView.setUint16(msgIdx, SERIAL_CHECK_DEVICE, LE);
        msgIdx += 2;
        msgIdx += 2 + 1; // len + crc
        // cmd data
        // ---
        let msgLen = msgIdx;
        let dataLen = msgLen - HEAD_LEN;
        pktView.setUint16(LEN_IDX, dataLen, LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++) {
            crc ^= pktData[i];
        }
        pktView.setUint8(CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10) {
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, 'utf8', ()=>{
            // ---
        });
    }

}
