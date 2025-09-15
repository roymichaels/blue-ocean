import React from 'react';

import type { ActivityEvent } from '../hooks/useDashboardData';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => (
  <section className="activity-feed" aria-label="Recent activity">
    <ol className="activity-feed__list">
      {events.map((event) => (
        <li key={event.id} className="activity-feed__item">
          <div className={`activity-feed__marker activity-feed__marker--${event.severity}`} aria-hidden="true" />
          <div className="activity-feed__content">
            <header className="activity-feed__header">
              <h3 className="activity-feed__title">{event.title}</h3>
              <time dateTime={event.timestampISO} className="activity-feed__timestamp">
                {event.timestamp}
              </time>
            </header>
            <p className="activity-feed__description">{event.description}</p>
            <p className="activity-feed__meta">
              {event.actor}
              {event.location ? ` · ${event.location}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

export default ActivityFeed;
