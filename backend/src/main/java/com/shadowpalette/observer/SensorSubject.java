package com.shadowpalette.observer;

import java.util.ArrayList;
import java.util.List;

public class SensorSubject {
    private final List<SensorObserver> observers = new ArrayList<>();

    public void registerObserver(SensorObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(SensorObserver observer) {
        observers.remove(observer);
    }

    public void notifyObservers(DetectionEvent event) {
        for (SensorObserver observer : observers) {
            observer.onDetectionTriggered(event);
        }
    }

    public int getObserverCount() {
        return observers.size();
    }
}
