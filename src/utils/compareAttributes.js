function normalizeString(s) {
    return (s || '').toString().trim().toLowerCase();
}

function exactSimilarity(a, b) {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    return normalizeString(a) === normalizeString(b) ? 1 : 0;
}

function numericSimilarity(a, b) {
    if (a == null || b == null) return 0;
    const na = Number(a);
    const nb = Number(b);
    if (isNaN(na) || isNaN(nb)) return exactSimilarity(a, b);
    if (na === nb) return 1;
    const diff = Math.abs(na - nb);
    if (diff <= 1) return 0.8;
    if (diff <= 3) return 0.5;
    return 0;
}

function modelSimilarity(stored, incoming) {
    if (!stored || !incoming) return 0;
    const s = normalizeString(stored);
    const i = normalizeString(incoming);
    if (s === i) return 1;
    if (s.startsWith(i) || i.startsWith(s)) return 0.9;
    if (s.includes(i) || i.includes(s)) return 0.7;
    return 0;
}

const WEIGHTS = {
    hardware: {
        board: 2,
        bootloader: 2,
        brand: 5,
        device: 3,
        fingerprint: 10,
        hardware: 2,
        host: 1,
        id: 1,
        manufacturer: 5,
        model: 5,
        product: 2,
        tags: 1,
        type: 1,
        systemFeatures: 2,
        supportedAbis: 3,
        supported32BitAbis: 1,
        supported64BitAbis: 1,
        sdkInt: 1,
        release: 1,
        codename: 1,
        name: 2,
        systemName: 1,
        systemVersion: 1,
        localizedModel: 1,
        identifierForVendor: 6,
        machine: 2,
        nodename: 1,
        sysname: 1,
        version: 1
    },
    system: {
        deviceId: 15,
        operatingSystem: 3,
        androidId: 7,
        isEmulator: 2
    },
    app: {
        appName: 1,
        packageName: 4,
        version: 2,
        buildNumber: 1,
        buildSignature: 1
    }
};

function compareSection(storedSection = {}, incomingSection = {}, weightMap = {}) {
    let totalWeight = 0;
    let scoreAccum = 0;

    for (const key of Object.keys(weightMap)) {
        const weight = weightMap[key];
        if (!weight) continue;

        const a = storedSection[key];
        const b = incomingSection[key];

        let similarity = 0;
        if (typeof a === 'number' || typeof b === 'number') {
            similarity = numericSimilarity(a, b);
        } else if (key === 'model') {
            similarity = modelSimilarity(a, b);
        } else {
            similarity = exactSimilarity(a, b);
        }

        totalWeight += weight;
        scoreAccum += weight * similarity;
    }

    const normalized = totalWeight > 0 ? (scoreAccum / totalWeight) * 100 : 0;
    return Math.round(normalized * 100) / 100;
}

function compareAttributes(stored, incoming) {
    const hardwareScore = compareSection(stored.hardware || {}, incoming.hardware || {}, WEIGHTS.hardware);
    const systemScore = compareSection(stored.system || {}, incoming.system || {}, WEIGHTS.system);
    const appScore = compareSection(stored.app || {}, incoming.app || {}, WEIGHTS.app);
    const overall = Math.round(((hardwareScore * 0.6) + (systemScore * 0.25) + (appScore * 0.15)) * 100) / 100;

    return {
        hardwareScore,
        systemScore,
        appScore,
        overallScore: overall,
        passed: overall >= 85,
    };
}

module.exports = { compareAttributes };
