const ForbiddenWord = require('../models/forbiddenWord.model');
const { redisClient } = require('../config/redis');

const CACHE_KEY = 'forbidden_words';

class ForbiddenWordsService {
    constructor() {
        this.loadForbiddenWords();
    }

    async loadForbiddenWords() {
        try {
            const words = await ForbiddenWord.find({});
            const wordsByLang = words.reduce((acc, { word, language }) => {
                if (!acc[language]) acc[language] = [];

                // Split sentences into individual words and add each word separately
                // do not split Arabic words, only split English sentences
                const individualWords = language === 'en' ? word.split(/\s+/).filter(w => w.trim().length > 0) : [word];
                individualWords.forEach(individualWord => {
                    if (!acc[language].includes(individualWord.toLowerCase())) {
                        acc[language].push(individualWord.toLowerCase());
                    }
                });

                return acc;
            }, { en: [], ar: [] });

            // Cache the words in Redis
            await redisClient.set(CACHE_KEY, JSON.stringify(wordsByLang), {
                EX: 3600, // Expiration time in seconds
                NX: false,
            });

            return wordsByLang;
        } catch (error) {
            console.error('Error loading forbidden words:', error);
            return { en: [], ar: [] };
        }
    }

    async getForbiddenWords() {
        try {
            const cached = await redisClient.get(CACHE_KEY);
            if (cached) return JSON.parse(cached);
            return this.loadForbiddenWords();
        } catch (error) {
            console.error('Error getting forbidden words:', error);
            return { en: [], ar: [] };
        }
    }

    async containsForbiddenWords(text) {
        if (!text) return false;

        const words = await this.getForbiddenWords();
        const lowerText = text.toLowerCase();

        // Split input text into words for better matching
        const textWords = lowerText.split(/\s+/).map(word => word.replace(/[^\w\u0600-\u06FF]/g, ''));

        // Check English words
        const hasEnglishForbiddenWord = words.en.some(forbiddenWord =>
            textWords.some(textWord => textWord === forbiddenWord)
        );

        // Check Arabic words - for Arabic, also check if forbidden word is contained in text
        const hasArabicForbiddenWord = words.ar.some(forbiddenWord =>
            textWords.some(textWord => textWord === forbiddenWord)
        );

        return hasEnglishForbiddenWord || hasArabicForbiddenWord;
    }
}
const forbiddenWordsService = new ForbiddenWordsService();

module.exports = forbiddenWordsService; 