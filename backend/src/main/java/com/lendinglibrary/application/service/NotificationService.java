package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.NotificationResponse;
import com.lendinglibrary.domain.entity.Notification;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserService userService;

    public List<NotificationResponse> list(String email) {
        var user = userService.findByEmail(email);
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(NotificationResponse::from).toList();
    }

    public long unreadCount(String email) {
        var user = userService.findByEmail(email);
        return notificationRepository.countByUserAndReadFalse(user);
    }

    @Transactional
    public NotificationResponse markRead(UUID id, String email) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        if (!notification.getUser().getEmail().equals(email)) {
            throw new BusinessException("This notification does not belong to the current user");
        }
        notification.setRead(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }
}
