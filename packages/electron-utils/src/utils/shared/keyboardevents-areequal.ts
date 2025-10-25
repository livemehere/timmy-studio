function _lower(key: string | undefined): string | undefined {
    if (typeof key !== 'string') {
        return key;
    }
    return key.toLowerCase();
}

export function eventsAreEqual(
    ev1: Record<string, any>,
    ev2: Record<string, any>
): boolean {
    if (ev1 === ev2) {
        // 같은 객체
        // console.log(`Events are same.`)
        return true;
    }

    for (const prop of ['altKey', 'ctrlKey', 'shiftKey', 'metaKey'] as const) {
        const [value1, value2] = [ev1[prop], ev2[prop]];

        if (Boolean(value1) !== Boolean(value2)) {
            // 속성 중 하나가 다름
            // console.log(`Comparing prop ${prop}: ${value1} ${value2}`);
            return false;
        }
    }

    if ((_lower(ev1.key) === _lower(ev2.key) && ev1.key !== undefined) ||
        (ev1.code === ev2.code && ev1.code !== undefined)) {
        // 이벤트가 동일함
        return true;
    }

    // Key 또는 code가 다름
    // console.log(`key or code are differents. ${ev1.key} !== ${ev2.key} ${ev1.code} !== ${ev2.code}`);

    return false;
}