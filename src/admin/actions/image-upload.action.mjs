export const createImageUploadAction = () => ({
  editImage: {
    actionType: 'record',
    icon: 'Image',
    label: 'Edit Image',
    handler: async (request, response, context) => {
      const { record } = context;
      if (request.method === 'post') {
        const { imagePath } = request.payload;
        await record.update({ imagePath });
      }
      return {
        record: record.toJSON(),
      };
    },
  },
});
