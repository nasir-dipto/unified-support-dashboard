import type { ReactElement } from 'react';
import { TechnicianTicketsView } from './TechnicianTicketsView';

/**
 * Ticket inbox route — delegates to technician queue view.
 */
export function TicketsView(): ReactElement {
  return <TechnicianTicketsView />;
}
