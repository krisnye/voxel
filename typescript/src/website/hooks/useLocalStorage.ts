import { useState } from "preact/hooks";

function useStorage<T>(name: string, defaultValue: T, storage: Storage): [T, (t: T) => void] {
    let storageValue = storage.getItem(name);
    const [value, setValue] = useState<T>(storageValue ? JSON.parse(storageValue) as T : defaultValue);
    return [value, (newValue) => {
        storage.setItem(name, JSON.stringify(newValue));
        setValue(value);
    }];
}

export function useLocalStorage<T>(name: string, defaultValue: T) {
    return useStorage(name, defaultValue, localStorage);
}

export function useSessionStorage<T>(name: string, defaultValue: T) {
    return useStorage(name, defaultValue, sessionStorage);
}