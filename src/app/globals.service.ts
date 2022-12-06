import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GlobalsService {

    STATUS_SUCCESS = 0;
    //STATUS_FAILURE = 1;

    PACKET_ID = 0xACDC;
    CFG_PORT = 22802;

    LE = true;
    //BE = false;

    ZNP_MSG = 0x0050;

    CFG_STA_REQ = 0x0060;
    CFG_STA_RSP = 0x0061;
    CFG_AP_REQ = 0x0062;
    CFG_AP_RSP = 0x0063;

    NWK_KEY_LEN = 16;
    EPID_LEN = 8;
    SSID_LEN = 32;
    PSW_LEN = 16;

    AP_BEACON = 0x0042;

    PROG_STATE_IDLE = 0;
    PROG_STATE_CFG_STA = 1;
    PROG_STATE_CFG_NWK = 2;
    PROG_STATE_CFG_AP = 3;

    SOCKET_ERR = 0x01;
    SOCKET_BAD_PKT = 0x02;
    SOCKET_CONN_TMO = 0x03;

    WR_STA_CFG_TMO = 0x04;
    WR_STA_CFG_DONE = 0x05;
    WR_STA_CFG_FAILED = 0x06;

    WR_NWK_CFG_TMO = 0x07;
    WR_NWK_CFG_DONE = 0x08;
    WR_NWK_CFG_FAILED = 0x09;

    WR_AP_CFG_TMO = 0x0A;
    WR_AP_CFG_DONE = 0x0B;
    WR_AP_CFG_FAILED = 0x0C;

    RPC_SYS_ZCL = 22;

    ZCL_SET_NWK_SEC = 0x06;
    ZCL_SET_NWK_SEC_RSP = 0x86;

    constructor() {
    }

}
