
export interface rdCmd_t {
    ip: any;
    busy: boolean;
    tmoRef: any;
    cmdID: number;
    idx: number;
    retryCnt: number;
}

export interface sensorItem_t {
    hostIP: string;
    type: number;
    name: string;
    formatedVal: string;
    partNum: number;
    extAddr: number;
    endPoint: number;
}

export interface onOffItem_t {
    hostIP: string;
    type: number;
    name: string;
    state: number;
    level: number
    partNum: number;
    extAddr: number;
    endPoint: number;
}

export interface newTemp_t {
    valid: boolean;
    value: number;
}
export interface newRH_t {
    valid: boolean;
    value: number;
}

export interface newADC_t {
    valid: boolean;
    value: number;
}

export interface newPWM_t {
    value: number;
}

export interface newTC_t {
    value: number;
}

export interface tsSet_t {
    runFlag: number;
    tcTemp:number;
    setPoint: number;
    hist: number;
    duty:number
}


