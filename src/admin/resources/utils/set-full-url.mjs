/**
 *
 * @param response
 * @param context
 * @param field
 * @param prefix
 */
export default async function setFullUrl(response, context, field, prefix) {
  if (context.record && context.record.isValid() && context.record.params[field]) {
    // set to s3 url

    const baseUrl = process.env.S3_URL;
    const path = context.record.params[field];
    // Check if path starts with 'http' to avoid duplicating the base URL
    console.log('path', path);
    if (!path.startsWith('http')) {
      const fullUrl = `${baseUrl}${path}`;
      console.log('fullUrl', fullUrl);
      await context.record.update({ [field]: fullUrl });
      console.log('context.record', context.record);
    }
  }
  return response;
}
