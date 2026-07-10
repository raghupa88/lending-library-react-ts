package com.lendinglibrary.service;

import com.lendinglibrary.api.dto.FeatureFlagRequest;
import com.lendinglibrary.application.service.FeatureFlagService;
import com.lendinglibrary.domain.entity.FeatureFlag;
import com.lendinglibrary.domain.exception.BusinessException;
import com.lendinglibrary.domain.exception.ResourceNotFoundException;
import com.lendinglibrary.infrastructure.persistence.FeatureFlagRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeatureFlagServiceTest {

    @Mock FeatureFlagRepository featureFlagRepository;

    @Test
    void isEnabled_true_whenFlagEnabled() {
        var flag = FeatureFlag.builder().key("b2b_tier").name("B2B").enabled(true).build();
        when(featureFlagRepository.findByKey("b2b_tier")).thenReturn(Optional.of(flag));
        var service = new FeatureFlagService(featureFlagRepository);

        assertThat(service.isEnabled("b2b_tier")).isTrue();
    }

    @Test
    void isEnabled_false_whenFlagDisabled() {
        var flag = FeatureFlag.builder().key("b2b_tier").name("B2B").enabled(false).build();
        when(featureFlagRepository.findByKey("b2b_tier")).thenReturn(Optional.of(flag));
        var service = new FeatureFlagService(featureFlagRepository);

        assertThat(service.isEnabled("b2b_tier")).isFalse();
    }

    @Test
    void isEnabled_false_whenKeyUnknown() {
        when(featureFlagRepository.findByKey("nonexistent")).thenReturn(Optional.empty());
        var service = new FeatureFlagService(featureFlagRepository);

        assertThat(service.isEnabled("nonexistent")).isFalse();
    }

    @Test
    void listEnabledKeys_returnsOnlyEnabledOnes() {
        when(featureFlagRepository.findByEnabledTrue()).thenReturn(List.of(
                FeatureFlag.builder().key("b2b_tier").name("B2B").enabled(true).build()));
        var service = new FeatureFlagService(featureFlagRepository);

        assertThat(service.listEnabledKeys()).containsExactly("b2b_tier");
    }

    @Test
    void create_success() {
        when(featureFlagRepository.existsByKey("new_flag")).thenReturn(false);
        when(featureFlagRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var service = new FeatureFlagService(featureFlagRepository);

        var result = service.create(new FeatureFlagRequest("new_flag", "New Flag", "desc", null));

        assertThat(result.key()).isEqualTo("new_flag");
        assertThat(result.enabled()).isFalse();
    }

    @Test
    void create_duplicateKey_throws() {
        when(featureFlagRepository.existsByKey("b2b_tier")).thenReturn(true);
        var service = new FeatureFlagService(featureFlagRepository);

        assertThatThrownBy(() -> service.create(new FeatureFlagRequest("b2b_tier", "Dup", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void setEnabled_success_flipsFlag() {
        var flag = FeatureFlag.builder().key("b2b_tier").name("B2B").enabled(false).build();
        when(featureFlagRepository.findByKey("b2b_tier")).thenReturn(Optional.of(flag));
        when(featureFlagRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var service = new FeatureFlagService(featureFlagRepository);

        var result = service.setEnabled("b2b_tier", true);

        assertThat(result.enabled()).isTrue();
    }

    @Test
    void setEnabled_unknownKey_throws() {
        when(featureFlagRepository.findByKey("nonexistent")).thenReturn(Optional.empty());
        var service = new FeatureFlagService(featureFlagRepository);

        assertThatThrownBy(() -> service.setEnabled("nonexistent", true))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
