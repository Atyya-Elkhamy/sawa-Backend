import ForbiddenWord from '../../../models/forbiddenWord.model.js';

const forbiddenWordResource = {
    resource: ForbiddenWord,
    options: {
        isVisible: ({ currentAdmin }) => {
            return currentAdmin && currentAdmin.role === 'superadmin';
        },
        navigation: {
            name: 'إدارة المحتوى',
            icon: 'Shield',
        },
        properties: {
            word: {
                type: 'string',
                isTitle: true,
                isRequired: true,
            },
            language: {
                type: 'string',
                isRequired: true,
                availableValues: [
                    { value: 'en', label: 'English' },
                    { value: 'ar', label: 'Arabic' },
                ],
            },
            createdAt: {
                type: 'datetime',
                isVisible: { list: true, filter: true, show: true, edit: false },
            },
            updatedAt: {
                type: 'datetime',
                isVisible: { list: true, filter: true, show: true, edit: false },
            },
        },
        actions: {
            list: {
                isAccessible: ({ currentAdmin }) => {
                   
                    return currentAdmin && currentAdmin.role === 'superadmin';
                }
            },
            new: {
                after: async (response, request, context) => {
                    // Reload forbidden words cache after adding new word
                    const forbiddenWordsService = (await import('../../../services/forbiddenWords.service.js')).default;
                    await forbiddenWordsService.loadForbiddenWords();
                    return response;
                },
            },
            edit: {
                after: async (response, request, context) => {
                    const forbiddenWordsService = (await import('../../../services/forbiddenWords.service.js')).default;
                    await forbiddenWordsService.loadForbiddenWords();
                    return response;
                },
            },

            bulkDelete: {
                isVisible: false, // Disable bulk delete to maintain data integrity
            },
        },
        sort: {
            sortBy: 'createdAt',
            direction: 'desc',
        },
        filterProperties: ['word', 'language', 'createdAt'],
        listProperties: ['word', 'language', 'createdAt'],
        showProperties: ['word', 'language', 'createdAt', 'updatedAt'],
        editProperties: ['word', 'language'],
    },
};

export default forbiddenWordResource;
