/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://aiaeezktxgervrnmqszo.supabase.co/storage/v1/object/public/email-assets/tf-logo.png'
import type { TemplateEntry } from './registry.ts'

const NAVY = '#1B3A6B'
const RED = '#CC2027'
const TEXT = '#2D2D2D'
const MUTED = '#6B7280'
const BG = '#F8F9FA'
const BORDER = '#E5E7EB'

interface Props {
  companyName?: string
  contactName?: string
  tier?: string
  discountPercentage?: number
  loginUrl?: string
}

const ApplicationApprovedEmail = ({
  companyName = 'your company',
  contactName,
  tier = 'Bronze',
  discountPercentage = 0,
  loginUrl = 'https://partners.total-filtration.com/reset-password',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're approved — set your password to access the TF USA Partner Portal</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Section style={header}>
          <Img src={LOGO_URL} alt="Total Filtration USA" width="180" style={{ display: 'block', margin: '0 auto' }} />
        </Section>
        <Container style={container}>
          <Text style={h1}>Welcome to TF USA{contactName ? `, ${contactName}` : ''}!</Text>
          <Text style={text}>
            Great news — your partner application for <strong>{companyName}</strong> has been approved.
            You can now access the TF USA Partner Portal to browse products, request quotes and manage orders.
          </Text>

          <Section style={infoBox}>
            <Text style={infoRow}><strong>Tier:</strong> {tier}</Text>
            <Text style={infoRow}><strong>Partner discount:</strong> {discountPercentage}%</Text>
          </Section>

          <Text style={text}>
            Click the button below to set your password and sign in for the first time.
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={loginUrl} style={button}>Get your login</Button>
          </Section>

          <Text style={small}>
            Or copy this link into your browser:<br />
            <a href={loginUrl} style={linkStyle}>{loginUrl}</a>
          </Text>

          <Text style={small}>
            Need help? Reply to this email or contact us at{' '}
            <a href="mailto:partners@total-filtration.com" style={linkStyle}>partners@total-filtration.com</a>.
          </Text>
        </Container>
        <Section style={footerWrap}>
          <Text style={footerText}>Total Filtration USA LLC</Text>
          <Text style={footerMuted}>14422 Shoreside Way, Suite 110 #132, Winter Garden, Florida 34787</Text>
          <Text style={footerMuted}>+1-407-842-0818 | partners@total-filtration.com</Text>
        </Section>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: ApplicationApprovedEmail,
  subject: (data: Record<string, any>) =>
    `You're approved — welcome to TF USA Partner Portal`,
  displayName: 'Application approved',
  previewData: {
    companyName: 'Vertica Supply Group',
    contactName: 'Shane',
    tier: 'Silver',
    discountPercentage: 15,
    loginUrl: 'https://partners.total-filtration.com/reset-password',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const outer = { backgroundColor: BG, padding: '0' }
const header = { backgroundColor: '#ffffff', padding: '24px 32px', textAlign: 'center' as const, borderBottom: `3px solid ${NAVY}` }
const container = { backgroundColor: '#ffffff', maxWidth: '600px', margin: '32px auto', padding: '32px', border: `1px solid ${BORDER}`, borderRadius: '8px' }
const h1 = { fontSize: '22px', fontWeight: 600 as const, color: NAVY, margin: '0 0 16px' }
const text = { fontSize: '15px', color: TEXT, lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: BG, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '12px 16px', margin: '16px 0' }
const infoRow = { fontSize: '14px', color: TEXT, margin: '4px 0' }
const button = { backgroundColor: NAVY, color: '#FFFFFF', fontSize: '15px', fontWeight: 600 as const, borderRadius: '6px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const linkStyle = { color: NAVY, textDecoration: 'underline', wordBreak: 'break-all' as const }
const small = { fontSize: '13px', color: MUTED, margin: '16px 0 0', lineHeight: '1.5' }
const footerWrap = { padding: '16px 32px 32px', textAlign: 'center' as const, backgroundColor: BG }
const footerText = { fontSize: '12px', color: MUTED, margin: '0 0 4px' }
const footerMuted = { fontSize: '12px', color: '#9CA3AF', margin: '0 0 4px' }
