import React, { useState, useCallback } from 'react';
import { Box, H3, Text, Button, Icon, MessageBox, DropZone } from '@adminjs/design-system';
import { useNotice, ApiClient } from 'adminjs';

const api = new ApiClient();

const FileUploadComponent = ({ record: rec, action }) => {
  const resourceId = 'Gift';
  const actionName = action.name;
  const property = action.name === 'uploadImage' ? 'image' : 'file';
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const sendNotice = useNotice();

  // Get the current file path from the record
  const currentFile = rec?.params?.[property] || '';

  // Key is used to force DropZone remount when we want to clear it
  const [dropZoneKey, setDropZoneKey] = useState(0);

  const onUpload = useCallback(
    (files) => {
      setUploadError(null);

      const file = files[0];
      if (!file) return;

      // Validate file type
      const validTypes = property === 'image' ? ['image/jpeg', 'image/png', 'image/jpg'] : ['application/pdf', 'audio/mpeg'];
      if (!validTypes.includes(file.type)) {
        setUploadError(`Invalid file type. Please upload a ${validTypes.join(' or ')} file.`);
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setUploadError('File is too large. Maximum size is 5MB.');
        return;
      }

      setSelectedFile(file);
    },
    [property]
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      setUploadError('No file selected.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.recordAction({
        resourceId,
        recordId: rec.id,
        actionName,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      sendNotice({ message: 'File uploaded successfully', type: 'success' });
      setDropZoneKey((prev) => prev + 1); // Reset dropzone
      setSelectedFile(null);
    } catch (error) {
      setUploadError(error.message || 'Error uploading file');
      sendNotice({ message: 'Error uploading file', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, property, rec.id, resourceId, actionName, sendNotice]);

  const handleRemove = useCallback(async () => {
    try {
      await api.recordAction({
        resourceId,
        recordId: rec.id,
        actionName,
        data: {
          [property]: null,
        },
      });

      sendNotice({ message: 'File removed successfully', type: 'success' });
      setDropZoneKey((prev) => prev + 1);
    } catch (error) {
      sendNotice({ message: 'Error removing file', type: 'error' });
    }
  }, [property, rec.id, resourceId, actionName, sendNotice]);

  return (
    <Box>
      <H3>Upload File</H3>
      <Box mb="xl">
        <Text variant="sm">Upload a {property === 'image' ? 'JPG or PNG image' : 'PDF or MP3 file'} (max 5MB)</Text>
      </Box>

      {uploadError && (
        <Box mb="xl">
          <MessageBox variant="danger">{uploadError}</MessageBox>
        </Box>
      )}

      {currentFile && (
        <Box mb="xl" flex alignItems="center">
          <Box mr="lg" position="relative" flex alignItems="center">
            {property === 'image' ? (
              <img
                src={currentFile}
                alt="Current"
                style={{
                  maxWidth: '200px',
                  maxHeight: 'auto',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Text>{currentFile}</Text>
            )}
          </Box>
          <Button variant="danger" size="sm" onClick={handleRemove} disabled={isUploading}>
            <Icon icon="TrashCan" />
            Remove
          </Button>
        </Box>
      )}

      <Box>
        <DropZone
          key={dropZoneKey}
          onChange={onUpload}
          multiple={false}
          validate={{
            mimeTypes: property === 'image' ? ['image/jpeg', 'image/png', 'image/jpg'] : ['application/pdf', 'audio/mpeg'],
            maxSize: 5 * 1024 * 1024,
          }}
          disabled={isUploading}
        >
          {isUploading ? (
            <Box p="xl" display="flex" justifyContent="center">
              <Text>Uploading...</Text>
            </Box>
          ) : (
            <Box p="xl" display="flex" justifyContent="center" flexDirection="column" alignItems="center">
              <Icon icon="Upload" size={20} color="primary100" />
              <Text mt="default">Drag and drop a file here, or click to select</Text>
              <Text mt="sm" variant="sm" color="grey">
                {property === 'image' ? 'JPG or PNG, max 5MB' : 'PDF or MP3, max 5MB'}
              </Text>
            </Box>
          )}
        </DropZone>
      </Box>

      {selectedFile && (
        <Box mt="lg">
          <Text variant="sm">Selected file: {selectedFile.name}</Text>
        </Box>
      )}

      <Box mt="lg">
        <Button variant="primary" onClick={handleSubmit} disabled={isUploading || !selectedFile}>
          <Icon icon="Upload" />
          Submit
        </Button>
      </Box>
    </Box>
  );
};

export default FileUploadComponent;
