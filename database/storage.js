export function load(key, fallback = null) {

    try {

        const value =
            localStorage.getItem(key);

        if (value === null) {
            return fallback;
        }

        return JSON.parse(value);

    } catch (error) {

        console.log(
            "KAGE STORAGE LOAD ERROR:",
            error
        );

        return fallback;

    }

}

export function save(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;

    } catch (error) {

        console.log(
            "KAGE STORAGE SAVE ERROR:",
            error
        );

        return false;

    }

}
