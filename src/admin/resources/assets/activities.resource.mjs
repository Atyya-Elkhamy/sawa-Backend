import Activity from '../../../models/extra/activity.model.js';
import { componentLoader, Components } from '../components/component-loader.mjs';
import setFullUrl from '../utils/set-full-url.mjs';
import awsUploadFeature from '../../config/upload.mjs';

const activityResource = {
  resource: Activity,
  options: {
    properties: {
      image: {
        type: 'string',
        isVisible: { list: true, edit: true, filter: true, show: true },
        components: {
          list: Components.CustomUploadShowComponent,
          show: Components.CustomUploadShowComponent,
        },
      },
      name: { type: 'string', isTitle: true, isRequired: true },
      link: { type: 'string', isVisible: { list: true, edit: true, filter: true, show: true } },
      hidden: {
        type: 'boolean',
        isVisible: { list: true, edit: true, filter: true, show: true },
        default: false,
      },
    },
    listProperties: ['image', 'name', 'link', 'hidden'],
    editProperties: ['image', 'fileUpload', 'name', 'link', 'hidden'],
    showProperties: ['image', 'name', 'link', 'hidden'],
    filterProperties: ['name', 'link', 'hidden'],
    navigation: {
      name: 'إدارة الأصول',
      icon: 'Package',
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) => {
          return (
            currentAdmin &&
            (currentAdmin.role === 'superadmin' ||
              currentAdmin.role === 'support' ||
              currentAdmin.role === 'manager')
          );
        },
      },
      new: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'activities');
          return response;
        },
      },
      edit: {
        after: async (response, request, context) => {
          await setFullUrl(response, context, 'image', 'activities');
          return response;
        },
      },
      // hide
      hide: {
        actionType: 'record',
        icon: 'Hide',
        isVisible: (context) => !context.record.params.hidden,
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ hidden: true });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إخفاء النشاط بنجاح',
              type: 'success',
            },
          };
        },
      },
      show: {
        actionType: 'record',
        icon: 'Show',
        isVisible: (context) => context.record.params.hidden,
        component: false,
        handler: async (request, response, context) => {
          const { record } = context;
          await record.update({ hidden: false });
          return {
            record: record.toJSON(context.currentAdmin),
            notice: {
              message: 'تم إظهار النشاط بنجاح',
              type: 'success',
            },
          };
        },
      },
    },
  },
  features: [
    awsUploadFeature({
      componentLoader,

      properties: {
        key: 'image', // Field in the database to store image path
        file: 'fileUpload', // Virtual field to handle file input
      },
    }),
  ],
};

export default activityResource;
