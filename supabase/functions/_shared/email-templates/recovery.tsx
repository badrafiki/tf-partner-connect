/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { Layout } from './_layout.tsx'
import { h1, text, button, small } from './_brand.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Layout preview="Reset your TF USA Partner Portal password">
    <Heading style={h1}>Reset your password</Heading>
    <Text style={text}>
      We received a request to reset your password for the TF USA Partner Portal.
      Click the button below to choose a new password.
    </Text>
    <Button style={button} href={confirmationUrl}>Reset Password</Button>
    <Text style={small}>
      If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
    </Text>
    <Text style={small}>The TF USA Team</Text>
  </Layout>
)

export default RecoveryEmail
