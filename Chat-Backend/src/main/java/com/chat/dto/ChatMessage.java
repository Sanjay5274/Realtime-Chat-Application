package com.chat.dto;

import java.time.LocalDateTime;

/**
 * Used for WebSocket real-time messaging.
 * Client sends: conversationId + content (+ senderEmail as fallback).
 * Server responds with the full saved message details.
 */
public class ChatMessage {

    // --- Incoming fields (client → server) ---
    private Long conversationId;
    private String content;
    // senderEmail: only used as fallback when STOMP Principal is unavailable
    private String senderEmail;

    // --- Outgoing fields (server → client) ---
    private Long id;
    private Long senderId;
    private String senderUsername;
    private LocalDateTime createdAt;
    private boolean delivered;
    private boolean read;

    public ChatMessage() {
    }

    // Getters and setters

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSenderEmail() {
        return senderEmail;
    }

    public void setSenderEmail(String senderEmail) {
        this.senderEmail = senderEmail;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isDelivered() {
        return delivered;
    }

    public void setDelivered(boolean delivered) {
        this.delivered = delivered;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }
}
