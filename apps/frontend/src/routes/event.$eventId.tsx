import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { 
  Card, Box, Typography, CardContent, Grid, GridItem,
  StatusBadge, InfoBox, ProgressBar, ProgressBarFill, ActionButton, 
  PageContainer, Spacer, Flex 
} from '@testwelbi/ui'
import { graphql } from '../graphql'
import { execute } from '../graphql/execute'
import { formatDate, isDateBefore, isDateAfter, now, toDate } from '@testwelbi/time'

// GraphQL query for a single event with all details
const EventDetailQuery = graphql(`
  query EventDetail($id: ID!) {
    event(id: $id) {
      id
      title
      description
      startTime
      endTime
      duration
      allDay
      maxParticipants
      currentParticipants
      availableSpots
      registrationRequired
      registrationDeadline
      status
      notes
      createdAt
      updatedAt
      isRegistered
    }
  }
`)

// GraphQL mutations for registration

const RegisterForEventMutation = graphql(`
  mutation RegisterForEvent($eventId: ID!) {
    registerForEvent(eventId: $eventId) {
      success
      message
      event {
        id
        currentParticipants
        availableSpots
        isRegistered
      }
    }
  }
`)

const CancelEventRegistrationMutation = graphql(`
  mutation CancelEventRegistration($eventId: ID!) {
    cancelEventRegistration(eventId: $eventId) {
      success
      message
      event {
        id
        currentParticipants
        availableSpots
        isRegistered
      }
    }
  }
`)

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const queryClient = useQueryClient()
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const { data: eventData, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => execute(EventDetailQuery, { id: eventId }),
  })

  // Registration mutation with optimistic updates
  const registerMutation = useMutation({
    mutationFn: () => execute(RegisterForEventMutation, { eventId }),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })
      
      // Snapshot previous value
      const previousEvent = queryClient.getQueryData(['event', eventId])
      
      // Optimistically update
      queryClient.setQueryData(['event', eventId], (old: any) => {
        if (!old?.event) return old
        return {
          ...old,
          event: {
            ...old.event,
            isRegistered: true,
            currentParticipants: (old.event.currentParticipants || 0) + 1,
            availableSpots: old.event.maxParticipants ? old.event.maxParticipants - ((old.event.currentParticipants || 0) + 1) : null,
          }
        }
      })
      
      return { previousEvent }
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent)
      }
      setFeedbackMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to register for event' })
    },
    onSuccess: (data) => {
      if (data.registerForEvent.success) {
        setFeedbackMessage({ type: 'success', text: data.registerForEvent.message || 'Successfully registered!' })
        // Invalidate to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ['event', eventId] })
        queryClient.invalidateQueries({ queryKey: ['events'] })
      } else {
        // Server returned success: false
        setFeedbackMessage({ type: 'error', text: data.registerForEvent.message || 'Failed to register' })
        // Rollback optimistic update
        queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      }
    },
  })

  // Cancellation mutation with optimistic updates
  const cancelMutation = useMutation({
    mutationFn: () => execute(CancelEventRegistrationMutation, { eventId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })
      const previousEvent = queryClient.getQueryData(['event', eventId])
      
      queryClient.setQueryData(['event', eventId], (old: any) => {
        if (!old?.event) return old
        return {
          ...old,
          event: {
            ...old.event,
            isRegistered: false,
            currentParticipants: Math.max((old.event.currentParticipants || 0) - 1, 0),
            availableSpots: old.event.maxParticipants ? old.event.maxParticipants - Math.max((old.event.currentParticipants || 0) - 1, 0) : null,
          }
        }
      })
      
      return { previousEvent }
    },
    onError: (err, _variables, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent)
      }
      setFeedbackMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel registration' })
    },
    onSuccess: (data) => {
      if (data.cancelEventRegistration.success) {
        setFeedbackMessage({ type: 'success', text: data.cancelEventRegistration.message || 'Registration cancelled' })
        queryClient.invalidateQueries({ queryKey: ['event', eventId] })
        queryClient.invalidateQueries({ queryKey: ['events'] })
      } else {
        setFeedbackMessage({ type: 'error', text: data.cancelEventRegistration.message || 'Failed to cancel' })
        queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      }
    },
  })

  const handleRegister = () => {
    setFeedbackMessage(null)
    registerMutation.mutate()
  }

  const handleCancel = () => {
    setFeedbackMessage(null)
    cancelMutation.mutate()
  }

  if (isLoading) {
    return (
      <PageContainer>
        <Typography $variant="h4" $gutterBottom>
          Loading Event Details...
        </Typography>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <Typography $variant="h4" $gutterBottom $color="error">
          Error Loading Event
        </Typography>
        <Typography $variant="body1">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </Typography>
      </PageContainer>
    )
  }

  if (!eventData?.event) {
    return (
      <PageContainer>
        <Typography $variant="h4" $gutterBottom>
          Event Not Found
        </Typography>
        <Typography $variant="body1">
          The requested event could not be found.
        </Typography>
      </PageContainer>
    )
  }

  const event = eventData.event
  const startDate = toDate(event.startTime)
  const endDate = toDate(event.endTime)
  const createdDate = toDate(event.createdAt)
  const updatedDate = toDate(event.updatedAt)
  const currentTime = now()

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  return (
    <PageContainer role="main" aria-labelledby="event-title">
      {/* Header */}
      <Box>
        <Typography $variant="h3" $gutterBottom id="event-title">
          {event.title}
        </Typography>
        <Flex $align="center" $gap="md" role="group" aria-label="Event status badges">
          <StatusBadge $status={event.status as 'scheduled' | 'completed' | 'cancelled' || 'scheduled'}>
            {getStatusText(event.status || 'scheduled')}
          </StatusBadge>
          {event.registrationRequired && (
            <StatusBadge $status="warning">
              Registration Required
            </StatusBadge>
          )}
          {event.allDay && (
            <StatusBadge $status="info">
              All Day Event
            </StatusBadge>
          )}
        </Flex>
        <Spacer $size="md" />
        
        {event.description && (
          <Typography $variant="h6" $color="muted">
            {event.description}
          </Typography>
        )}
      </Box>
      <Spacer $size="xl" />

      <Grid $columns={12} $gap={4}>
        {/* Date & Time Information */}
        <GridItem $colSpan={8}>
          <Card $variant="primary">
            <CardContent>
              <Typography $variant="h5" $gutterBottom>
                📅 Date & Time
              </Typography>
              
              <Grid $columns={2} $gap={3}>
                <GridItem $colSpan={1}>
                  <Box>
                    <Typography $variant="h6" $color="muted">
                      Start Time
                    </Typography>
                    <Spacer $size="xs" />
                    <Typography $variant="body1" $fontSize="xl" $fontWeight="bold">
                      {formatDate(startDate, 'EEEE, MMMM d, yyyy')}
                    </Typography>
                    <Typography $variant="body1" $fontSize="base" $color="muted">
                      {formatDate(startDate, 'h:mm a')}
                    </Typography>
                  </Box>
                  <Spacer $size="md" />
                </GridItem>
                
                <GridItem $colSpan={1}>
                  <Box>
                    <Typography $variant="h6" $color="muted">
                      End Time
                    </Typography>
                    <Spacer $size="xs" />
                    <Typography $variant="body1" $fontSize="xl" $fontWeight="bold">
                      {formatDate(endDate, 'EEEE, MMMM d, yyyy')}
                    </Typography>
                    <Typography $variant="body1" $fontSize="base" $color="muted">
                      {formatDate(endDate, 'h:mm a')}
                    </Typography>
                  </Box>
                  <Spacer $size="md" />
                </GridItem>
              </Grid>

              {event.duration && (
                <InfoBox $variant="tertiary">
                  <Typography $variant="h6" $color="muted">
                    Duration
                  </Typography>
                  <Spacer $size="xs" />
                  <Typography $variant="body1" $fontSize="base">
                    {Math.floor(event.duration / 60)} hours {event.duration % 60} minutes
                  </Typography>
                </InfoBox>
              )}
            </CardContent>
          </Card>
        </GridItem>

        {/* Participation Information */}
        <GridItem $colSpan={4}>
          <Card $variant="primary">
            <CardContent>
              <Typography $variant="h5" $gutterBottom>
                👥 Participation
              </Typography>
              
              {event.maxParticipants ? (
                <>
                  <Box>
                    <Typography $variant="h6" $color="muted" id="capacity-label">
                      Capacity
                    </Typography>
                    <Spacer $size="sm" />
                    <Flex $align="center" $gap="sm" aria-labelledby="capacity-label">
                      <Typography $variant="h4" $color="primary">
                        {event.currentParticipants || 0}
                      </Typography>
                      <Typography $variant="h6" $color="muted">
                        / {event.maxParticipants}
                      </Typography>
                    </Flex>
                    <Spacer $size="sm" />
                    
                    {/* Progress Bar */}
                    <ProgressBar 
                      role="progressbar" 
                      aria-valuenow={event.currentParticipants || 0}
                      aria-valuemin={0}
                      aria-valuemax={event.maxParticipants}
                      aria-label={`${event.currentParticipants || 0} of ${event.maxParticipants} spots filled`}
                    >
                      <ProgressBarFill style={{ 
                        width: `${Math.min(((event.currentParticipants || 0) / event.maxParticipants) * 100, 100)}%`
                      }} />
                    </ProgressBar>
                  </Box>
                  <Spacer $size="md" />

                  {event.availableSpots !== null && event.availableSpots !== undefined && (
                    <InfoBox $variant={event.availableSpots > 0 ? 'success' : 'error'}>
                      <Typography $variant="body1" $fontWeight="bold" $color={event.availableSpots > 0 ? 'success' : 'error'}>
                        {event.availableSpots > 0 
                          ? `${event.availableSpots} spots available` 
                          : 'Fully booked'
                        }
                      </Typography>
                    </InfoBox>
                  )}
                </>
              ) : (
                <Typography $variant="body1" $color="muted">
                  No capacity limit
                </Typography>
              )}

              {event.registrationDeadline && (
                <>
                  <Spacer $size="md" />
                  <Box>
                    <Typography $variant="h6" $color="muted">
                      Registration Deadline
                    </Typography>
                    <Spacer $size="xs" />
                    <Typography $variant="body1">
                      {formatDate(event.registrationDeadline, 'EEE, MMM d, h:mm a')}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Registration Button */}
              {isDateAfter(endDate, currentTime) && (
                <>
                  <Spacer $size="lg" />
                  {event.isRegistered ? (
                    <ActionButton 
                      onClick={handleCancel}
                      disabled={
                        cancelMutation.isPending || 
                        event.status === 'cancelled' || 
                        event.status === 'completed' ||
                        (event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime))
                      }
                      style={{ 
                        width: '100%',
                        backgroundColor: '#dc2626',
                        opacity: (
                          cancelMutation.isPending || 
                          event.status === 'cancelled' || 
                          event.status === 'completed' ||
                          (event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime))
                        ) ? 0.6 : 1
                      }}
                      aria-label="Cancel event registration"
                      aria-disabled={
                        cancelMutation.isPending || 
                        event.status === 'cancelled' || 
                        event.status === 'completed' ||
                        (event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime))
                      }
                    >
                      {cancelMutation.isPending ? 'Cancelling...' : '✕ Cancel Registration'}
                    </ActionButton>
                  ) : (
                    <ActionButton 
                      onClick={handleRegister}
                      disabled={
                        registerMutation.isPending || 
                        event.status === 'cancelled' || 
                        event.status === 'completed' ||
                        (event.availableSpots !== null && event.availableSpots <= 0) ||
                        (event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime))
                      }
                      style={{ 
                        width: '100%',
                        opacity: (
                          registerMutation.isPending || 
                          event.status === 'cancelled' || 
                          event.status === 'completed' ||
                          (event.availableSpots !== null && event.availableSpots <= 0) ||
                          (event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime))
                        ) ? 0.6 : 1
                      }}
                      aria-label="Register for event"
                      aria-disabled={
                        registerMutation.isPending || 
                        event.status === 'cancelled' || 
                        event.status === 'completed' ||
                        (event.availableSpots !== null && event.availableSpots <= 0) ||
                        (event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime))
                      }
                    >
                      {registerMutation.isPending ? 'Registering...' : '✓ Register for Event'}
                    </ActionButton>
                  )}

                  {/* Feedback Message */}
                  {feedbackMessage && (
                    <>
                      <Spacer $size="sm" />
                      <InfoBox 
                        $variant={feedbackMessage.type === 'success' ? 'success' : 'error'}
                        role="alert"
                        aria-live="assertive"
                      >
                        <Typography 
                          $variant="body1" 
                          $fontWeight="bold" 
                          $color={feedbackMessage.type === 'success' ? 'success' : 'error'}
                        >
                          {feedbackMessage.text}
                        </Typography>
                      </InfoBox>
                    </>
                  )}

                  {/* Registration Status Badge */}
                  <Spacer $size="sm" />
                  {event.isRegistered && (
                    <InfoBox $variant="success" role="status" aria-live="polite">
                      <Typography $variant="body2" $fontWeight="bold" $color="success">
                        ✓ You are registered for this event
                      </Typography>
                    </InfoBox>
                  )}

                  {/* Disabled State Explanation - only show when button is disabled but still visible */}
                  {!event.isRegistered && (
                    <>
                      {event.registrationDeadline && isDateBefore(toDate(event.registrationDeadline), currentTime) && (
                        <InfoBox $variant="warning" role="status">
                          <Typography $variant="body2" $color="warning">
                            ⚠️ Registration deadline has passed.
                          </Typography>
                        </InfoBox>
                      )}
                      {event.availableSpots !== null && event.availableSpots <= 0 && (!event.registrationDeadline || isDateAfter(toDate(event.registrationDeadline), currentTime)) && (
                        <InfoBox $variant="error" role="status">
                          <Typography $variant="body2" $color="error">
                            🚫 Event is fully booked.
                          </Typography>
                        </InfoBox>
                      )}
                      {event.status === 'cancelled' && (
                        <InfoBox $variant="error" role="status">
                          <Typography $variant="body2" $color="error">
                            🚫 This event has been cancelled.
                          </Typography>
                        </InfoBox>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Show message when event has ended */}
              {isDateBefore(endDate, currentTime) && (
                <>
                  <Spacer $size="lg" />
                  <InfoBox $variant="warning" role="status">
                    <Typography $variant="body2" $color="warning">
                      ⚠️ This event has ended. Registration is no longer available.
                    </Typography>
                  </InfoBox>
                </>
              )}
            </CardContent>
          </Card>
        </GridItem>

        {/* Additional Details */}
        <GridItem $colSpan={12}>
          <Card $variant="primary">
            <CardContent>
              <Typography $variant="h5" $gutterBottom>
                📋 Additional Information
              </Typography>
              
              <Grid $columns={3} $gap={3}>
                <GridItem $colSpan={1}>
                  <InfoBox $variant="default">
                    <Typography $variant="h6" $color="muted">
                      Event ID
                    </Typography>
                    <Spacer $size="sm" />
                    <Typography $variant="body1">
                      {event.id}
                    </Typography>
                  </InfoBox>
                </GridItem>
                
                <GridItem $colSpan={1}>
                  <InfoBox $variant="default">
                    <Typography $variant="h6" $color="muted">
                      Created
                    </Typography>
                    <Spacer $size="sm" />
                    <Typography $variant="body1">
                      {formatDate(createdDate, 'MMM d, yyyy')}
                    </Typography>
                  </InfoBox>
                </GridItem>
                
                <GridItem $colSpan={1}>
                  <InfoBox $variant="default">
                    <Typography $variant="h6" $color="muted">
                      Last Updated
                    </Typography>
                    <Spacer $size="sm" />
                    <Typography $variant="body1">
                      {formatDate(updatedDate, 'MMM d, yyyy')}
                    </Typography>
                  </InfoBox>
                </GridItem>
              </Grid>

              {event.notes && (
                <>
                  <Spacer $size="lg" />
                  <InfoBox $variant="warning">
                    <Typography $variant="h6" $color="warning">
                      📝 Notes
                    </Typography>
                    <Spacer $size="sm" />
                    <Typography $variant="body1">
                      {event.notes}
                    </Typography>
                  </InfoBox>
                </>
              )}
            </CardContent>
          </Card>
        </GridItem>
      </Grid>

      {/* Back Button */}
      <Spacer $size="xl" />
      <Flex $justify="center">
        <ActionButton onClick={() => window.history.back()}>
          ← Back to Calendar
        </ActionButton>
      </Flex>
    </PageContainer>
  )
}

export const Route = createFileRoute('/event/$eventId')({
  component: EventDetailPage,
}) 