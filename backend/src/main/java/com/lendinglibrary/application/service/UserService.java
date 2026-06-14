package com.lendinglibrary.application.service;

import com.lendinglibrary.api.dto.UpdateUserRequest;
import com.lendinglibrary.api.dto.UserResponse;
import com.lendinglibrary.domain.entity.User;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.domain.exception.UnauthorizedException;
import com.lendinglibrary.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    public UserResponse getById(UUID id, String requestingEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        User requester = findByEmail(requestingEmail);
        // Only allow access to own profile unless admin
        if (!requester.getId().equals(id) && requester.getRole().name().equals("MEMBER")) {
            throw new UnauthorizedException("Access denied");
        }
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest req, String requestingEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        User requester = findByEmail(requestingEmail);
        if (!requester.getId().equals(id)) {
            throw new UnauthorizedException("Cannot update another user's profile");
        }
        if (req.firstName() != null) user.setFirstName(req.firstName());
        if (req.lastName() != null) user.setLastName(req.lastName());
        if (req.phone() != null) user.setPhone(req.phone());
        if (req.address() != null) user.setAddress(req.address());
        return UserResponse.from(userRepository.save(user));
    }
}
