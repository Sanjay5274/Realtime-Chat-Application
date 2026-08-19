package com.chat.controller;

import com.chat.dto.ConversationSummaryDto;
import com.chat.dto.CreateGroupRequest;
import com.chat.entity.Conversation;
import com.chat.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    // POST /api/conversations/private?userId1=X&userId2=Y
    @PostMapping("/private")
    public ResponseEntity<Conversation> createPrivateConversation(
            @RequestParam Long userId1,
            @RequestParam Long userId2) {

        return ResponseEntity.ok(
                conversationService.createPrivateConversation(userId1, userId2)
        );
    }

    // POST /api/conversations/group
    @PostMapping("/group")
    public ResponseEntity<Conversation> createGroupConversation(
            @RequestBody CreateGroupRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                conversationService.createGroupConversation(
                        authentication.getName(),
                        request.getName(),
                        request.getMemberIds()
                )
        );
    }

    // POST /api/conversations/{id}/members?userId=X
    @PostMapping("/{conversationId}/members")
    public ResponseEntity<Conversation> addMember(
            @PathVariable Long conversationId,
            @RequestParam Long userId,
            Authentication authentication) {

        return ResponseEntity.ok(
                conversationService.addMemberToGroup(
                        conversationId, userId, authentication.getName()
                )
        );
    }

    // GET /api/conversations/my — returns all conversations for the authenticated user
    @GetMapping("/my")
    public ResponseEntity<List<ConversationSummaryDto>> getMyConversations(
            Authentication authentication) {

        return ResponseEntity.ok(
                conversationService.getMyConversations(authentication.getName())
        );
    }
}