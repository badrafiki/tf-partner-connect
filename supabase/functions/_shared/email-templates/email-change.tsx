/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { Layout } from './_layout.tsx'
import { h1, text, button, small } from './_brand.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Layout preview="Confirm your email change for the TF USA Partner Portal">
    <Heading style={h1}>Confirm your email change</Heading>
    <Text style={text}>
      You requested to change your TF USA Partner Portal email from{' '}
      <strong>{email}</strong> to <strong>{newEmail}</strong>.
    </Text>
    <Text style={text}>Click the button below to confirm this change.</Text>
    <Button style={button} href={confirmationUrl}>Confirm Email Change</Button>
    <Text style={small}>
      If you didn't request this change, please secure your account immediately by
      contacting <a href="mailto:partners@total-filtration.com" style={{ color: '#1B3A6B', fontWeight: 600, textDecoration: 'none' }}>partners@total-filtration.com</a>.
    </Text>
    <Text style={small}>The TF USA Team</Text>
  </Layout>
)

export default EmailChangeEmail
