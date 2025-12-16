// resources/components/broadcast-form.jsx
import React, { useState } from 'react';
import { Box, Button, Header, Text, TextArea, Input, Label, MessageBox } from '@adminjs/design-system';
import { useTranslation } from 'adminjs';

const BroadcastForm = (props) => {
  const { resource, action } = props;
  const { translateButton } = useTranslation();

  const [eventName, setEventName] = useState('broadCastSent');
  const [eventData, setEventData] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      // Validate JSON before sending
      try {
        JSON.parse(eventData);
      } catch (err) {
        throw new Error('Invalid JSON format in Data field');
      }

      // Use AdminJS API to call the action handler
      const res = await resource.callAction({
        actionName: 'new',
        params: {},
        data: {
          eventName,
          eventData,
        },
      });

      setResponse(res.data.notice);
    } catch (error) {
      setResponse({
        message: `Error: ${error.message}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} flex flexDirection="column" width={1}>
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
        <Label>Event Data (JSON)</Label>
        <TextArea
          value={eventData}
          onChange={(e) => setEventData(e.target.value)}
          rows={8}
          placeholder='{"key": "value"}'
          width={1}
        />
        <Text mt="sm" fontSize="sm" color="grey">
          Enter valid JSON object
        </Text>
      </Box>

      {response && (
        <Box mb="xl">
          <MessageBox variant={response.type === 'success' ? 'success' : 'danger'}>{response.message}</MessageBox>
        </Box>
      )}

      <Box>
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : translateButton('Send Broadcast')}
        </Button>
      </Box>
    </Box>
  );
};

export default BroadcastForm;
