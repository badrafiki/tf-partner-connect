/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { Layout } from './_layout.tsx'
import { h1, text, codeStyle, small } from './_brand.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Layout preview="Your TF USA Partner Portal verification code">
    <Heading style={h1}>Confirm your identity</Heading>
    <Text style={text}>Use the code below to confirm your identity:</Text>
    <Text style={codeStyle}>{token}</Text>
    <Text style={small}>
      This code will expire shortly. If you didn't request this, you can safely ignore this email.
    </Text>
    <Text style={small}>The TF USA Team</Text>
  </Layout>
)

export default ReauthenticationEmail
