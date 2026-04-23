/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { Layout } from './_layout.tsx'
import { h1, text, button, small } from './_brand.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Layout preview="Welcome to the TF USA Partner Portal — set your password">
    <Heading style={h1}>Welcome to the TF USA Partner Portal</Heading>
    <Text style={text}>
      Your distributor account has been approved. To get started, click the button
      below to set your password and sign in.
    </Text>
    <Button style={button} href={confirmationUrl}>Set Password &amp; Sign In</Button>
    <Text style={text}>
      Once signed in, you'll be able to browse our product catalogue, request
      quotations, place orders, and manage your account.
    </Text>
    <Text style={small}>
      Questions? Reach out at{' '}
      <a href="mailto:partners@total-filtration.com" style={{ color: '#1B3A6B', fontWeight: 600, textDecoration: 'none' }}>
        partners@total-filtration.com
      </a>.
    </Text>
    <Text style={small}>The TF USA Team</Text>
  </Layout>
)

export default InviteEmail
