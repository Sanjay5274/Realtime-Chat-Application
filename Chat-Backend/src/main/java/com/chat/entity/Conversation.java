package com.chat.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversationType type;

    // Optional — used for GROUP conversations to give them a display name
    @Column(length = 100)
    private String name;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Conversation() {
    }

    public Conversation(ConversationType type) {
        this.type = type;
    }

    public Conversation(ConversationType type, String name) {
        this.type = type;
        this.name = name;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public ConversationType getType() {
        return type;
    }

    public void setType(ConversationType type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}