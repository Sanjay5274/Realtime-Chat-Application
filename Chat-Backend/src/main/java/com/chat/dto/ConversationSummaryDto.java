package com.chat.dto;

import com.chat.entity.ConversationType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Returned by GET /api/conversations/my.
 * Avoids circular-reference issues by projecting only what the frontend needs.
 */
public class ConversationSummaryDto {

    private Long id;
    private ConversationType type;
    private String name;
    private LocalDateTime createdAt;
    private List<MemberInfo> members;

    public ConversationSummaryDto() {}

    public ConversationSummaryDto(Long id, ConversationType type, String name,
                                   LocalDateTime createdAt, List<MemberInfo> members) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.createdAt = createdAt;
        this.members = members;
    }

    public Long getId()                  { return id; }
    public ConversationType getType()    { return type; }
    public String getName()              { return name; }
    public LocalDateTime getCreatedAt()  { return createdAt; }
    public List<MemberInfo> getMembers() { return members; }

    // -----------------------------------------------------------------
    // Inner DTO — avoids returning full User entities with lazy fields
    // -----------------------------------------------------------------
    public static class MemberInfo {
        private Long userId;
        private String username;
        private String email;
        private Boolean online;

        public MemberInfo() {}

        public MemberInfo(Long userId, String username, String email, Boolean online) {
            this.userId   = userId;
            this.username = username;
            this.email    = email;
            this.online   = online;
        }

        public Long getUserId()    { return userId; }
        public String getUsername(){ return username; }
        public String getEmail()   { return email; }
        public Boolean getOnline() { return online; }
    }
}
