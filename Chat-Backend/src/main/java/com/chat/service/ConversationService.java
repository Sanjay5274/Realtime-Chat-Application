package com.chat.service;

import com.chat.dto.ConversationSummaryDto;
import com.chat.entity.Conversation;
import com.chat.entity.ConversationMember;
import com.chat.entity.ConversationType;
import com.chat.entity.User;
import com.chat.repository.ConversationMemberRepository;
import com.chat.repository.ConversationRepository;
import com.chat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserRepository userRepository;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationMemberRepository memberRepository,
            UserRepository userRepository) {

        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    // ------------------------------------------------------------------
    // Private one-to-one conversation
    // ------------------------------------------------------------------

    public Conversation createPrivateConversation(Long userId1, Long userId2) {

        User user1 = userRepository.findById(userId1)
                .orElseThrow(() -> new RuntimeException("User 1 not found"));

        User user2 = userRepository.findById(userId2)
                .orElseThrow(() -> new RuntimeException("User 2 not found"));

        Conversation conversation = new Conversation(ConversationType.PRIVATE);
        Conversation saved = conversationRepository.save(conversation);

        memberRepository.save(new ConversationMember(saved, user1));
        memberRepository.save(new ConversationMember(saved, user2));

        return saved;
    }

    // ------------------------------------------------------------------
    // Group conversation
    // ------------------------------------------------------------------

    public Conversation createGroupConversation(
            String creatorEmail, String groupName, List<Long> memberIds) {

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("Creator not found"));

        Conversation conversation = new Conversation(ConversationType.GROUP, groupName);
        Conversation saved = conversationRepository.save(conversation);

        memberRepository.save(new ConversationMember(saved, creator));

        if (memberIds != null) {
            for (Long memberId : memberIds) {
                User member = userRepository.findById(memberId)
                        .orElseThrow(() -> new RuntimeException("Member not found: " + memberId));
                if (!member.getId().equals(creator.getId())) {
                    memberRepository.save(new ConversationMember(saved, member));
                }
            }
        }

        return saved;
    }

    public Conversation addMemberToGroup(Long conversationId, Long userId, String requesterEmail) {

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (conversation.getType() != ConversationType.GROUP) {
            throw new RuntimeException("Cannot add members to a PRIVATE conversation");
        }

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("Requester not found"));

        if (!memberRepository.existsByConversationIdAndUserId(conversationId, requester.getId())) {
            throw new RuntimeException("You are not a member of this conversation");
        }

        User newMember = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (memberRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("User is already a member of this conversation");
        }

        memberRepository.save(new ConversationMember(conversation, newMember));
        return conversation;
    }

    // ------------------------------------------------------------------
    // GET /api/conversations/my — list all conversations for a user
    // @Transactional ensures lazy fields can be accessed within this session
    // ------------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<ConversationSummaryDto> getMyConversations(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        List<ConversationMember> memberships = memberRepository.findByUserId(user.getId());

        return memberships.stream().map(membership -> {
            Conversation conv = membership.getConversation();
            List<ConversationMember> allMembers = memberRepository.findByConversationId(conv.getId());

            List<ConversationSummaryDto.MemberInfo> memberInfos = allMembers.stream()
                    .map(m -> new ConversationSummaryDto.MemberInfo(
                            m.getUser().getId(),
                            m.getUser().getUsername(),
                            m.getUser().getEmail(),
                            m.getUser().getOnline()
                    ))
                    .collect(Collectors.toList());

            return new ConversationSummaryDto(
                    conv.getId(), conv.getType(), conv.getName(), conv.getCreatedAt(), memberInfos
            );
        }).collect(Collectors.toList());
    }

    // ------------------------------------------------------------------
    // Helper used by MessageService
    // ------------------------------------------------------------------
    public boolean isMember(Long conversationId, Long userId) {
        return memberRepository.existsByConversationIdAndUserId(conversationId, userId);
    }
}