import React from 'react';
import { Box, Text, Badge } from '@adminjs/design-system';

const ChatMessagesDisplay = (props) => {
  const { record, property } = props;
  
  // Get chat messages from record params
  const chatMessages = record?.params?.chatMessages || [];

  if (!chatMessages || chatMessages.length === 0) {
    return (
      <Box padding="lg">
        <Text variant="body1" color="muted">
          لا توجد رسائل في هذه المحادثة
        </Text>
      </Box>
    );
  }

  const getMessageTypeLabel = (type) => {
    const typeLabels = {
      text: 'نص',
      image: 'صورة',
      voice: 'صوت',
      gift: 'هدية',
      emoji: 'ملصق',
      invitation: 'دعوة',
    };
    return typeLabels[type] || type;
  };

  const getMessageTypeColor = (type) => {
    const typeColors = {
      text: 'default',
      image: 'info',
      voice: 'success',
      gift: 'warning',
      emoji: 'secondary',
      invitation: 'primary',
    };
    return typeColors[type] || 'default';
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Box padding="lg">
      <Text variant="h6" marginBottom="md">
        رسائل المحادثة ({chatMessages.length} رسالة)
      </Text>
      
      <Box maxHeight="600px" overflow="auto" border="1px solid #e0e0e0" borderRadius="md" padding="md">
        {chatMessages.map((message, index) => {
          const messageId = message._id || message.id || index;
          
          return (
            <Box key={messageId} marginBottom="sm">
              <Box 
                border="1px solid #f0f0f0" 
                borderRadius="sm" 
                padding="sm" 
                backgroundColor="black"
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" marginBottom="xs">
                  <Box display="flex" alignItems="center" gap="xs">
                    <Text variant="body2" fontWeight="bold" color="primary">
                      {message.sender || 'مجهول'}
                    </Text>
                    <Text variant="caption" color="muted">
                      إلى
                    </Text>
                    <Text variant="body2" fontWeight="bold" color="secondary">
                      {message.receiver || 'مجهول'}
                    </Text>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap="xs">
                    <Badge 
                      variant={getMessageTypeColor(message.messageType)}
                      size="sm"
                    >
                      {getMessageTypeLabel(message.messageType)}
                    </Badge>
                    
                    {message.isRead && (
                      <Badge variant="success" size="sm">
                        مقروء
                      </Badge>
                    )}
                    
                    {message.isDeleted && (
                      <Badge variant="danger" size="sm">
                        محذوف
                      </Badge>
                    )}
                  </Box>
                </Box>
                
                {message.body && (
                  <Box 
                    backgroundColor="#000" 
                    padding="sm" 
                    borderRadius="sm" 
                    marginY="xs"
                    border="1px solid #f0f0f0"
                  >
                    <Text variant="body1" dir="auto">
                      {message.body}
                    </Text>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="flex-end" marginTop="xs">
                  <Text variant="caption" color="muted">
                    {formatDate(message.createdAt)}
                  </Text>
                </Box>
              </Box>
              
              {index < chatMessages.length - 1 && (
                <Box height="1px" backgroundColor="#e0e0e0" marginY="xs" />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ChatMessagesDisplay;
