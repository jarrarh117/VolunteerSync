import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface CompletionEmailProps {
  volunteerEmail?: string;
  taskTitle?: string;
  coordinatorName?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const CompletionEmail = ({
  volunteerEmail = "volunteer@example.com",
  taskTitle = "Community Park Cleanup",
  coordinatorName = "Alex",
}: CompletionEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your hard work has been verified! Thank you for your contribution.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          data-ai-hint="logo"
          src={`https://picsum.photos/120/30`}
          width="120"
          height="30"
          alt="CosmicConnect"
          style={logo}
        />
        <Text style={paragraph}>Hi {volunteerEmail.split('@')[0]},</Text>
        <Text style={paragraph}>
          This is to confirm that your participation in the task,{" "}
          <span style={highlight}>{taskTitle}</span>, has been successfully
          verified by your coordinator, {coordinatorName}.
        </Text>
        <Text style={paragraph}>
          Your dedication and effort are what make our community initiatives possible. We are incredibly grateful for your contribution.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={`${baseUrl}/dashboard/volunteer`}>
            View Your Dashboard
          </Button>
        </Section>
        <Text style={paragraph}>
          Keep up the amazing work!
          <br />
          <br />
          Best regards,
          <br />
          The CosmicConnect Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          CosmicConnect, Connecting volunteers with opportunities.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CompletionEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logo = {
  margin: "0 auto",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const highlight = {
  fontWeight: "bold",
  color: "#5626FF"
}

const btnContainer = {
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#5626FF",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px",
  margin: "20px 0"
};

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
};
