export const createFileUploadAction = () => ({
  editFile: {
    actionType: 'record',
    icon: 'File',
    label: 'Edit File',
    handler: async (request, response, context) => {
      const { record } = context;
      if (request.method === 'post') {
        const { filePath } = request.payload;
        await record.update({ filePath });
      }
      return {
        record: record.toJSON(),
      };
    },
  },
});
