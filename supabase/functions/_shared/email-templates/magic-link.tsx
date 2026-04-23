/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import { Layout } from './_layout.tsx'
import { h1, text, button, small } from './_brand.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Layout preview="Your TF USA Partner Portal sign-in link">
    <Heading style={h1}>Your sign-in link</Heading>
    <Text style={text}>
      Click the button below to sign in to the TF USA Partner Portal. This link
      will expire shortly.
    </Text>
    <Button style={button} href={confirmationUrl}>Sign In</Button>
    <Text style={small}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
    <Text style={small}>The TF USA Team</Text>
  </Layout>
)

export default MagicLinkEmail
