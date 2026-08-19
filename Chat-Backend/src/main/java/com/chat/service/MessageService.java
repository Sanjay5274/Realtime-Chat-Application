package com.chat.service;

import com.chat.entity.Conversation;
import com.chat.entity.Message;
import com.chat.entity.User;
import com.chat.repository.ConversationMemberRepository;
import com.chat.repository.ConversationRepository;
import com.chat.repository.MessageRepository;
import com.chat.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ConversationMemberRepository memberRepository;

    public MessageService(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            ConversationMemberRepository memberRepository) {

        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
    }

    // ------------------------------------------------------------------
    // Send a message — sender must be a member of the conversation
    // ------------------------------------------------------------------
    public Message sendMessage(
            Long conversationId,
            String senderEmail,
            String content) {

        Conversation conversation =
                conversationRepository.findById(conversationId)
                        .orElseThrow(() ->
                                new RuntimeException("Conversation not found")
                        );

        User sender =
                userRepository.findByEmail(senderEmail)
                        .orElseThrow(() ->
                                new RuntimeException("Sender not found")
                        );

        // Verify sender is a member of the conversation
        boolean isMember = memberRepository
                .existsByConversationIdAndUserId(conversationId, sender.getId());

        if (!isMember) {
            throw new RuntimeException(
                    "You are not a member of this conversation"
            );
        }

        Message message = new Message(content, conversation, sender);

        return messageRepository.save(message);
    }

    // ------------------------------------------------------------------
    // Get messages — requester must be a member of the conversation
    // ------------------------------------------------------------------
    public List<Message> getMessages(
            Long conversationId,
            String requesterEmail) {

        // Verify conversation exists
        conversationRepository.findById(conversationId)
                .orElseThrow(() ->
                        new RuntimeException("Conversation not found")
                );

        User requester =
                userRepository.findByEmail(requesterEmail)
                        .orElseThrow(() ->
                                new RuntimeException("User not found")
                        );

        boolean isMember = memberRepository
                .existsByConversationIdAndUserId(conversationId, requester.getId());

        if (!isMember) {
            throw new RuntimeException(
                    "You are not a member of this conversation"
            );
        }

        return messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    // ------------------------------------------------------------------
    // Mark as delivered — internal / called after WebSocket broadcast
    // ------------------------------------------------------------------
    public Message markAsDelivered(Long messageId) {

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() ->
                        new RuntimeException("Message not found")
                );

        message.setDelivered(true);

        return messageRepository.save(message);
    }

    // ------------------------------------------------------------------
    // Mark as read — only a member of the conversation may mark as read
    // ------------------------------------------------------------------
    public Message markAsRead(Long messageId, String requesterEmail) {

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() ->
                        new RuntimeException("Message not found")
                );

        User requester =
                userRepository.findByEmail(requesterEmail)
                        .orElseThrow(() ->
                                new RuntimeException("User not found")
                        );

        Long conversationId = message.getConversation().getId();

        boolean isMember = memberRepository
                .existsByConversationIdAndUserId(conversationId, requester.getId());

        if (!isMember) {
            throw new RuntimeException(
                    "You are not authorized to mark this message as read"
            );
        }

        message.setRead(true);

        return messageRepository.save(message);
    }
}