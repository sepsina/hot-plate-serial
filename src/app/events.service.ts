import { Injectable } from '@angular/core';
import { Subject, Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class EventsService {
    private events = [];

    constructor() {
        // ---
    }
    public subscribe(event: string, callback: (value: any) => void): Subscription {
        if(this.events[event] === undefined) {
            this.events[event] = new Subject<any>();
        }
        return this.events[event].asObservable().subscribe(callback);
    }
    public publish(event: string, eventObject?: any): void {
        if(!this.events[event]) {
            return;
        }
        this.events[event].next(eventObject);
    }
}
