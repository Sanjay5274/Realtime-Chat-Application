package com.chat.controller;

import com.chat.dto.ChatMessage;
import com.chat.entity.Conversation;
import com.chat.entity.Message;
import com.chat.entity.User;
import com.chat.repository.ConversationMemberRepository;
import com.chat.repository.ConversationRepository;
import com.chat.repository.MessageRepository;
import com.chat.repository.UserRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Handles real-time STOMP WebSocket messages.
 *
 * Client connects to:  ws://localhost:8080/ws
 * Client subscribes:   /topic/conversation/{conversationId}
 * Client sends to:     /app/chat
 *
 * Payload (JSON):
 * {
 *   "conversationId": 1,
 *   "content": "Hello!",
 *   "senderEmail": "alice@example.com"   ← only needed if Principal is unavailable
 * }
 */
@Controller
public class WebSocketMessageController {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ConversationMemberRepository memberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketMessageController(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            ConversationMemberRepository memberRepository,
            SimpMessagingTemplate messagingTemplate) {

        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat")
    public void sendMessage(ChatMessage incoming, Principal principal) {

        try {
            // 1. Resolve sender email — prefer STOMP Principal, fall back to payload
            String senderEmail = (principal != null)
                    ? principal.getName()
                    : incoming.getSenderEmail();

            if (senderEmail == null || senderEmail.isBlank()) {
                System.out.println("WS: Cannot identify sender — message dropped");
                return;
            }

            // 2. Load sender
            User sender = userRepository.findByEmail(senderEmail)
                    .orElse(null);

            if (sender == null) {
                System.out.println("WS: Sender not found: " + senderEmail);
                return;
            }

            // 3. Load conversation
            Conversation conversation = conversationRepository
                    .findById(incoming.getConversationId())
                    .orElse(null);

            if (conversation == null) {
                System.out.println("WS: Conversation not found: " + incoming.getConversationId());
                return;
            }

            // 4. Verify sender is a member
            boolean isMember = memberRepository
                    .existsByConversationIdAndUserId(
                            conversation.getId(),
                            sender.getId()
                    );

            if (!isMember) {
                System.out.println("WS: Sender is not a member of conversation "
                        + conversation.getId());
                return;
            }

            // 5. Save message to DB (delivered=false initially)
            Message saved = messageRepository.save(
                    new Message(incoming.getContent(), conversation, sender)
            );

            // 6. Mark as delivered immediately after successful broadcast prep
            saved.setDelivered(true);
            saved = messageRepository.save(saved);

            // 7. Build response DTO
            ChatMessage response = new ChatMessage();
            response.setId(saved.getId());
            response.setConversationId(conversation.getId());
            response.setContent(saved.getContent());
            response.setSenderId(sender.getId());
            response.setSenderUsername(sender.getUsername());
            response.setSenderEmail(sender.getEmail());
            response.setCreatedAt(saved.getCreatedAt());
            response.setDelivered(saved.isDelivered());
            response.setRead(saved.isRead());

            // 8. Broadcast to all subscribers of this conversation
            messagingTemplate.convertAndSend(
                    "/topic/conversation/" + conversation.getId(),
                    response
            );

            System.out.println("WS: Message saved & broadcast to conversation "
                    + conversation.getId());

        } catch (Exception e) {
            System.out.println("WS ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
