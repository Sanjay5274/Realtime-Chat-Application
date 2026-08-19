package com.chat.controller;

import com.chat.entity.Message;
import com.chat.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    // ------------------------------------------------------------------
    // POST /api/messages?conversationId=X&content=hello
    // Send a message — sender is always the authenticated JWT user
    // ------------------------------------------------------------------
    @PostMapping
    public ResponseEntity<Message> sendMessage(
            @RequestParam Long conversationId,
            @RequestParam String content,
            Authentication authentication) {

        String email = authentication.getName();

        Message message = messageService.sendMessage(
                conversationId,
                email,
                content
        );

        return ResponseEntity.ok(message);
    }

    // ------------------------------------------------------------------
    // GET /api/messages/conversation/{conversationId}
    // Returns messages oldest → newest; requester must be a member
    // ------------------------------------------------------------------
    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<List<Message>> getMessages(
            @PathVariable Long conversationId,
            Authentication authentication) {

        String email = authentication.getName();

        return ResponseEntity.ok(
                messageService.getMessages(conversationId, email)
        );
    }

    // ------------------------------------------------------------------
    // POST /api/messages/{messageId}/delivered
    // Mark a message as delivered
    // ------------------------------------------------------------------
    @PostMapping("/{messageId}/delivered")
    public ResponseEntity<Message> markAsDelivered(
            @PathVariable Long messageId) {

        return ResponseEntity.ok(
                messageService.markAsDelivered(messageId)
        );
    }

    // ------------------------------------------------------------------
    // POST /api/messages/{messageId}/read
    // Mark a message as read — requester must be a member of the conversation
    // ------------------------------------------------------------------
    @PostMapping("/{messageId}/read")
    public ResponseEntity<Message> markAsRead(
            @PathVariable Long messageId,
            Authentication authentication) {

        String email = authentication.getName();

        return ResponseEntity.ok(
                messageService.markAsRead(messageId, email)
        );
    }
}