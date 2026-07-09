package com.lendinglibrary.infrastructure.events;

/** Kafka topic names — documented alongside their event schemas in docs/events.md. */
public final class Topics {
    public static final String LOAN_EVENTS = "library.loan.events";
    public static final String SUBSCRIPTION_EVENTS = "library.subscription.events";
    public static final String BOOK_EVENTS = "library.book.events";
    public static final String COURSE_EVENTS = "library.course.events";
    /** Reserved for the payments phase; no producer yet. */
    public static final String PAYMENT_EVENTS = "library.payment.events";
    public static final String USER_EVENTS = "library.user.events";

    private Topics() {}
}
