// admin/pages/broadcast-page.jsx
import React, { useState } from 'react';
import { Box, Button, Header, Text, TextArea, Input, Label, MessageBox, DropZone } from '@adminjs/design-system';
import { ApiClient } from 'adminjs';

const api = new ApiClient();

const BroadcastPage = () => {
  const [eventName, setEventName] = useState('broadCastSent');
  const [messageText, setMessageText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleUploadFiles = async (files) => {
    if (files && files.length > 0) {
      setUploadingFile(true);
      
      const file = files[0]; // Take only the first file
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        // Upload file using AdminJS file upload API
        const response = await api.getPage({
          pageName: 'upload',
          method: 'POST',
          data: formData,
        });
        
        if (response.data && response.data.url) {
          setImageUrl(response.data.url);
          setUploadedFiles([{
            name: file.name,
            size: file.size,
            url: response.data.url,
          }]);
        }
      } catch (error) {
        setResponse({
          message: `Error uploading file: ${error.message || 'Upload failed'}`,
          type: 'error',
        });
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      // Prepare data
      const messageData = {
        text: messageText,
        image: imageUrl
      };

      // Call the API
      const res = await api.getPage({
        pageName: 'AdminMessage',
        method: 'GET',
        params: {
          event: eventName,
          text: messageText,
          image: imageUrl,
          data: JSON.stringify(messageData),
        },
      });

      if (res.data.notice) {
        setResponse(res.data.notice);
      } else {
        setResponse({
          message: 'Broadcast sent successfully',
          type: 'success',
        });
      }
    } catch (error) {
      setResponse({
        message: `Error: ${error.message || 'Something went wrong'}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} flex flexDirection="column" width={1} p="lg">
      <Header>Send Broadcast to All Users</Header>

      <Box mb="xl">
        <Label>Event Name</Label>
        <Input
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          required
          placeholder="Enter event name"
          width={1}
        />
      </Box>

      <Box mb="xl">
        <Label>Message Text</Label>
        <TextArea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          rows={4}
          placeholder="Enter your message text"
          width={1}
        />
      </Box>

      <Box mb="xl">
        <Label>Upload Image</Label>
        <DropZone
          onChange={handleUploadFiles}
          multiple={false}
          validate={{
            mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          }}
          files={uploadedFiles}
        />
        {uploadingFile && <Text mt="sm">Uploading file...</Text>}
        {imageUrl && (
          <Box mt="default">
            <Text mb="sm">Image Preview:</Text>
            <img src={imageUrl} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
          </Box>
        )}
      </Box>

      {response && (
        <Box mb="xl">
          <MessageBox variant={response.type === 'success' ? 'success' : 'danger'}>{response.message}</MessageBox>
        </Box>
      )}

      <Box>
        <Button type="submit" disabled={loading || uploadingFile}>
          {loading ? 'Sending...' : 'Send Broadcast'}
        </Button>
      </Box>
    </Box>
  );
};

export default BroadcastPage;