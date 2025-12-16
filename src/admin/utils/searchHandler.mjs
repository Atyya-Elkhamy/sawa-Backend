// FILE: src/admin/utils/searchHandler.mjs

import flat from 'flat';
import { Filter } from 'adminjs';

export const searchHandler = {
  name: 'search',
  isVisible: false,
  actionType: 'resource',
  handler: async (request, response, data) => {
    const { currentAdmin, resource } = data;
    const decorated = resource.decorate();
    const titlePropertyName = decorated.titleProperty().name();

    // Get the query string from the correct location
    const queryString = request.params?.search || request.params?.query || '';
    console.log('Search query:', queryString);

    // Extract base parameters
    const sortBy = titlePropertyName;
    const direction = 'asc';
    const perPage = 50;
    const page = 1;

    let queryFilter = {};

    if (queryString) {
      const currentDate = new Date();

      // Build the search query
      queryFilter = {
        $or: [
          { name: { $regex: queryString, $options: 'i' } },
          { userId: queryString },
        ],
      };

      // If the query looks like a user ID (4 or more digits), prioritize exact matches
      if (/^\d{4,}$/.test(queryString)) {
        queryFilter = {
          $or: [
            { userId: queryString },
            { name: { $regex: queryString, $options: 'i' } },
          ],
        };
      }
    }

    try {
      const mongooseModel = resource.MongooseModel;

      // Execute the search query
      const records = await mongooseModel
        .find(queryFilter)
        .limit(perPage)
        .skip((page - 1) * perPage)
        .sort({ [sortBy]: direction === 'asc' ? 1 : -1 });

      // Get total count for pagination
      const total = await mongooseModel.countDocuments(queryFilter);

      // Transform records to AdminJS format
      const formattedRecords = records.map((record) => {
        const recordJson = record.toJSON();

        // userId now always contains the currently visible id (either original or active special id)
        const displayUserId = recordJson.userId;

        return {
          params: {
            ...recordJson,
            id: recordJson._id,
            userId: displayUserId,
          },
          populated: {},
          baseError: null,
          errors: {},
          id: recordJson._id,
          title: recordJson[titlePropertyName],
        };
      });

      return {
        records: formattedRecords,
        meta: {
          total,
          perPage,
          page,
          direction,
          sortBy,
        },
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },
};

export default searchHandler;
