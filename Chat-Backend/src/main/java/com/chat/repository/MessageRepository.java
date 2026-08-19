package com.chat.repository;

import com.chat.entity.Message;
import com.chat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MessageRepository
        extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByCreatedAtAsc(
            Long conversationId
    );
}