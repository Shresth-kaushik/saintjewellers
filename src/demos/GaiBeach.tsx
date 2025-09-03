"use client";

import { useState, useEffect, useRef } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container,
  IconButton,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  ThemeProvider,
  createTheme,
  useScrollTrigger,
  Link,
  keyframes,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  TextField,
} from "@mui/material";
import {
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  Menu as MenuIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
} from "@mui/icons-material";

declare global {
  interface Window {
    voiceflow?: any;
  }
}

interface RegisterCallResponse {
  access_token?: string;
  callId?: string;
  sampleRate: number;
}

interface UserDetails {
  name: string;
  dob: string;
  email: string;
  shippingAddress: string;
}

const webClient = new RetellWebClient();

// Create MUI theme (Saint Jeweller - black & gold)
const theme = createTheme({
  palette: {
    primary: {
      main: "#111111",
      light: "#2a2a2a",
      dark: "#000000",
    },
    secondary: {
      main: "#C6A662", // gold
      light: "#d7bd85",
      dark: "#9f874e",
    },
    error: {
      main: "#b91c1c",
      light: "#ef4444",
      dark: "#7f1d1d",
    },
    text: {
      primary: "#0f0f0f",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
  },
});

export default function GaiBeach() {
  const [callStatus, setCallStatus] = useState<
    "not-started" | "active" | "inactive"
  >("not-started");
  const [callInProgress, setCallInProgress] = useState(false);
  const [userDetails, _setUserDetails] = useState<UserDetails>({
    name: "",
    dob: "",
    email: "",
    shippingAddress: "",
  });
  const [transcript, setTranscript] = useState<any[]>([]);
  const chatContentRef = useRef<HTMLDivElement | null>(null);
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });
  // const [chatActive, setChatActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Retell event listeners
  useEffect(() => {
    webClient.on("conversationStarted", () => {
      console.log("Conversation started successfully");
      setCallStatus("active");
      setCallInProgress(false);
    });

    webClient.on("conversationEnded", ({ code, reason }) => {
      console.log("Conversation ended with code:", code, "reason:", reason);
      setCallStatus("inactive");
      setCallInProgress(false);
    });

    webClient.on("error", (error) => {
      console.error("An error occurred:", error);
      setCallStatus("inactive");
      setCallInProgress(false);
    });

    webClient.on("update", (update) => {
      if (update.transcript) {
        if (Array.isArray(update.transcript)) {
          setTranscript(update.transcript);
        } else if (typeof update.transcript === "object") {
          setTranscript([update.transcript]);
        } else if (typeof update.transcript === "string") {
          const messages = update.transcript
            .split("\n")
            .filter((line: string) => line.trim() !== "")
            .map((line: string) => ({
              role: "assistant",
              content: line.trim(),
            }));
          setTranscript(messages);
        }
      }
    });

    return () => {
      webClient.off("conversationStarted");
      webClient.off("conversationEnded");
      webClient.off("error");
      webClient.off("update");
    };
  }, []);

  // Using globally loaded Voiceflow Chat Widget
  useEffect(() => {
    // No need to add the script as it's already in index.html

    // Set user details if needed
    if (window.voiceflow && window.voiceflow.chat) {
      // Update user context if needed
      try {
        window.voiceflow.chat.updateContext({
          customer_name: userDetails.name,
          email: userDetails.email,
          DOB: userDetails.dob,
          shippingAddress: userDetails.shippingAddress
        });
      } catch (e) {
        console.log("Could not update context, will try again later");
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [userDetails]);

  // Programmatically open/close Voiceflow chat
  // (Removed: no chat toggle UI in current design)
  // useEffect(() => {
  //   const toggleChat = () => {
  //     if (typeof window !== "undefined" && window.voiceflow && window.voiceflow.chat) {
  //       if (chatActive) {
  //         window.voiceflow.chat.open();
  //       } else {
  //         window.voiceflow.chat.close();
  //       }
  //       return true;
  //     }
  //     return false;
  //   };
  //   if (!toggleChat()) {
  //     const intervalId = setInterval(() => {
  //       if (toggleChat()) {
  //         clearInterval(intervalId);
  //       }
  //     }, 500);
  //     setTimeout(() => clearInterval(intervalId), 5000);
  //     return () => clearInterval(intervalId);
  //   }
  // }, [chatActive]);

  // Force-hide any Retell floating widget or button so it never appears
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      /* Hide any Retell UI elements if they appear */
      .retell-floating-button,
      .retell-floating-widget,
      .retell-chat-container,
      .retell-web-widget {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  // Start/Stop voice call
  const toggleConversation = async () => {
    if (callInProgress) return;

    setCallInProgress(true);

    if (callStatus === "active") {
      try {
        await webClient.stopCall();
        setCallStatus("inactive");
      } catch (error) {
        console.error("Error stopping the call:", error);
      } finally {
        setCallInProgress(false);
      }
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await initiateConversation();
      } catch (error) {
        console.error("Microphone permission denied or error occurred:", error);
      } finally {
        setCallInProgress(false);
      }
    }
  };

  const initiateConversation = async () => {
    const agentId = "agent_b6e829ae1d617cef82d5e94504";
    try {
      const registerCallResponse = await registerCall(agentId);
      const accessToken = registerCallResponse.access_token;
      const callId = registerCallResponse.callId;
      const sampleRate = registerCallResponse.sampleRate;
      if (accessToken && callId) {
        await webClient.startCall({
          accessToken,
          callId,
          sampleRate,
          enableUpdate: true,
        } as any);
        setCallStatus("active");
      }
    } catch (error) {
      console.error("Error in registering or starting the call:", error);
    }
  };

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    const apiKey = "key_6d2f13875c4b0cdb80c6f031c6c4";
    const sampleRate = 16000;

    try {
      const response = await fetch(
        "https://api.retellai.com/v2/create-web-call",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            agent_id: agentId,
            retell_llm_dynamic_variables: {
              member_name: userDetails.name,
              email: userDetails.email,
              DOB: userDetails.dob,
              shippingAddress: userDetails.shippingAddress,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      return {
        access_token: data.access_token,
        callId: data.call_id,
        sampleRate,
      };
    } catch (err) {
      console.error("Error registering call:", err);
      throw err;
    }
  }

  const menuItems = [
    { label: "COLLECTIONS", href: "#collections" },
    { label: "ENGAGEMENT", href: "#engagement" },
    { label: "CUSTOM DESIGN", href: "#custom" },
    { label: "OUR STORY", href: "#our-story" },
    { label: "STORES", href: "#stores" },
    { label: "CONTACT", href: "#contact" },
  ];

  const pulse = keyframes`
    0% {
      box-shadow: 0 0 0 0 rgba(198, 166, 98, 0.6);
    }
    50% {
      box-shadow: 0 0 20px 15px rgba(198, 166, 98, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(198, 166, 98, 0);
    }
  `;

  const rotate = keyframes`
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 100% 50%;
    }
  `;

  // Auto-scroll transcript to bottom on new messages
  useEffect(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <ThemeProvider theme={theme}>
      {/* Navbar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: trigger
            ? "rgba(255, 255, 255, 0.98)"
            : "transparent",
          transition: "background-color 0.3s ease",
          boxShadow: trigger ? 1 : 0,
          width: "100%",
        }}
      >
        <Toolbar sx={{ width: "100%", px: { xs: 1, md: 2 }, pr: { md: 3 }, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <img src="/logo.png" alt="Saint Jeweller" style={{ height: 40 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: 1,
                color: trigger ? "text.primary" : "white",
              }}
            >
              SAINT JEWELLER
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            {menuItems.map((item) => (
              <Button
                key={item.label}
                component="a"
                href={item.href}
                sx={{
                  color: trigger ? "text.primary" : "white",
                  mx: 1,
                  px: 1.5,
                  minWidth: 0,
                  fontSize: { md: "0.9rem", lg: "1rem" },
                  textDecoration: "none",
                  "&:hover": {
                    backgroundColor: "transparent",
                    color: "secondary.main",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box sx={{ width: 140, display: { xs: "none", md: "block" } }} />
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ 
                display: { md: "none" },
                color: trigger ? "text.primary" : "white",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 280 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <MenuIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton component="a" href={item.href} onClick={() => setMobileMenuOpen(false)}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            component="a"
            href="https://www.instagram.com/saintjeweller?igsh=djRoamVlNzFycHlz"
            target="_blank"
            rel="noreferrer"
          >
            Follow on Instagram
          </Button>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box
        sx={{
          height: "100vh",
          width: "100%",
          position: "relative",
          backgroundImage: `linear-gradient(rgba(10,10,10,0.55), rgba(10,10,10,0.55)), url(https://images.unsplash.com/photo-1673417168620-a064b7eb58df?q=80&w=1746&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: "45%",
            left: "50%",
            transform: "translate(-50%, 50%)",
            display: "flex",
            gap: { xs: 4, md: 12 },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: { xs: "90%", sm: "600px" },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: "#fff",
              fontWeight: 700,
              textAlign: "center",
              letterSpacing: 1,
              fontSize: { xs: "1.8rem", sm: "2.4rem", md: "3rem" },
              fontFamily: 'cursive',
            }}
          >
            Timeless Jewellery, Crafted to Perfection
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {/* Animated Microphone Button */}
            <Button
              variant="contained"
              color={callStatus === "active" ? "error" : "secondary"}
              onClick={toggleConversation}
              sx={{
                borderRadius: "50%",
                width: "80px",
                height: "80px",
                minWidth: "80px",
                background:
                  callStatus === "active"
                    ? "linear-gradient(45deg, #b91c1c 30%, #ef4444 90%)"
                    : "linear-gradient(45deg, #C6A662 0%, #9f874e 100%)",
                boxShadow:
                  callStatus === "active"
                    ? "0 6px 20px rgba(185, 28, 28, 0.3)"
                    : "0 6px 20px rgba(198, 166, 98, 0.35)",
                "&:hover": {
                  transform: "scale(1.1)",
                  boxShadow:
                    callStatus === "active"
                      ? "0 8px 25px rgba(185, 28, 28, 0.4)"
                      : "0 8px 25px rgba(198, 166, 98, 0.45)",
                },
                animation: callStatus === "active" ? `${pulse} 1.5s infinite` : "none",
                transition: "all 0.3s ease-in-out",
                border: "3px solid rgba(255, 255, 255, 0.2)",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "-8px",
                  left: "-8px",
                  right: "-8px",
                  bottom: "-8px",
                  borderRadius: "50%",
                  background: "linear-gradient(45deg, #C6A662, #9f874e, #C6A662)",
                  backgroundSize: "200% 200%",
                  animation: callStatus === "active" ? `${rotate} 2s linear infinite` : "none",
                  zIndex: -1,
                },
              }}
            >
              {callStatus === "active" ? (
                <CallEndIcon sx={{ fontSize: 32, color: "white" }} />
              ) : (
                <CallIcon sx={{ fontSize: 32, color: "white" }} />
              )}
            </Button>
          </Box>

          {/* Transcript Box - Always Visible */}
          <Box
            sx={{
              width: "100%",
              maxWidth: "500px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              mt: 3,
              border: "1px solid rgba(255, 255, 255, 0.18)",
              backdropFilter: "blur(8px)",
              maxHeight: "200px",
            }}
          >
            <Box
              sx={{
                background: "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)",
                padding: "0.8rem 1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  margin: 0,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  letterSpacing: "0.5px",
                }}
              >
                Consultation Transcript
              </Typography>
            </Box>
            <Box
              ref={chatContentRef}
              sx={{
                padding: "1.2rem",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                height: transcript.length > 0 ? "150px" : "80px",
                transition: "height 0.3s ease-in-out",
                "&::-webkit-scrollbar": {
                  width: "6px",
                  display: "none", // Hide scrollbar
                },
                scrollbarWidth: "none", // Hide scrollbar for Firefox
                msOverflowStyle: "none", // Hide scrollbar for IE/Edge
              }}
            >
              {transcript.length > 0 ? (
                transcript.map((msg, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      margin: "6px 0",
                      maxWidth: "80%",
                      wordBreak: "break-word",
                      backgroundColor:
                        msg.role === "agent" ? "#f0f7ff" : "#1e3a8a",
                      color: msg.role === "agent" ? "#333" : "#fff",
                      alignSelf:
                        msg.role === "agent" ? "flex-start" : "flex-end",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      position: "relative",
                      "&::after":
                        msg.role !== "agent"
                          ? {
                              content: '""',
                              position: "absolute",
                              bottom: "8px",
                              right: "-6px",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#1e3a8a",
                              transform: "rotate(45deg)",
                              zIndex: -1,
                            }
                          : msg.role === "agent"
                          ? {
                              content: '""',
                              position: "absolute",
                              bottom: "8px",
                              left: "-6px",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#f0f7ff",
                              transform: "rotate(45deg)",
                              zIndex: -1,
                            }
                          : {},
                    }}
                  >
                    <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    opacity: 0.7,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#555",
                      fontStyle: "italic",
                      textAlign: "center",
                      fontSize: "0.95rem",
                    }}
                  >
                    {callStatus === "active"
                      ? "Listening... Speak now."
                      : "No messages yet."}
                  </Typography>
                  {callStatus !== "active" && (
                    <Typography
                      sx={{
                        color: "#555",
                        textAlign: "center",
                        fontSize: "0.85rem",
                        mt: 1,
                      }}
                    >
                      Click the microphone to begin a conversation
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Content Section */}
      <Container id="collections" maxWidth="lg" sx={{ py: 8, scrollMarginTop: "96px" }}>
        <Grid container spacing={4}>
          {/* Engagement Rings */}
          <Grid id="engagement" item xs={12} md={4} sx={{ scrollMarginTop: "96px" }}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image="https://images.unsplash.com/photo-1674465992629-f8f81a8fb6d9?q=80&w=1212&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Engagement Rings"
              />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Engagement Rings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Discover our curated selection of diamond solitaires and halo settings.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  {callStatus === "active" ? "End Call" : "View Collection"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Fine Necklaces */}
          <Grid id="necklaces" item xs={12} md={4} sx={{ scrollMarginTop: "96px" }}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image="https://images.unsplash.com/photo-1643236027686-399d6ebbbae0?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Fine Necklaces"
              />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Fine Necklaces
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Elegant pendants and chains crafted in 18K gold and platinum.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  {callStatus === "active" ? "End Call" : "View Collection"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Custom Pieces */}
          <Grid id="custom" item xs={12} md={4} sx={{ scrollMarginTop: "96px" }}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image="https://plus.unsplash.com/premium_photo-1681276170683-706111cf496e?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Custom Pieces"
              />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Custom Pieces
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Work with our artisans to bring your dream jewellery to life.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  {callStatus === "active" ? "End Call" : "Start a Design"}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Our Story */}
      <Box
        id="our-story"
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: { xs: 8, md: 10 },
          px: 2,
          mt: 2,
          scrollMarginTop: "96px",
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              textAlign: "center",
              fontWeight: 700,
              letterSpacing: 1,
            }}
            gutterBottom
          >
            Our Story
          </Typography>
          <Box
            sx={{
              width: 80,
              height: 3,
              bgcolor: "secondary.main",
              mx: "auto",
              mb: 4,
              borderRadius: 2,
            }}
          />
          <Typography variant="body1" sx={{ textAlign: "center", opacity: 0.9, lineHeight: 1.9 }}>
            Born from a passion for timeless craftsmanship, Saint Jeweller creates pieces that
            celebrate life’s most meaningful moments. Each design is thoughtfully sketched, ethically
            sourced, and meticulously hand-finished by our artisans. From exquisite engagement rings
            to bespoke heirlooms, our jewellery blends modern elegance with classic sophistication.
          </Typography>
        </Container>
      </Box>

      {/* Our Stores (expanded, placed under Our Story) */}
      <Box id="stores" sx={{ py: { xs: 8, md: 10 }, px: 2, bgcolor: "background.default", scrollMarginTop: "96px" }}>
        <Container maxWidth="lg">
          <Typography variant="h3" sx={{ textAlign: "center", fontWeight: 700, letterSpacing: 1 }} gutterBottom>
            Our Stores
          </Typography>
          <Box sx={{ width: 80, height: 3, bgcolor: "secondary.main", mx: "auto", mb: 6, borderRadius: 2 }} />
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ mb: 1 }}>Mumbai</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Bandra West</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Open: Mon–Sat, 11am–7pm</Typography>
              <Button size="small" variant="outlined">Book Visit</Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ mb: 1 }}>Delhi</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Mehrauli</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Open: Mon–Sat, 11am–7pm</Typography>
              <Button size="small" variant="outlined">Book Visit</Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ mb: 1 }}>Bengaluru</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Lavelle Road</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Open: Mon–Sat, 11am–7pm</Typography>
              <Button size="small" variant="outlined">Book Visit</Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Contact */}
      <Box id="contact" sx={{ py: { xs: 8, md: 10 }, px: 2, bgcolor: "background.default", scrollMarginTop: "96px" }}>
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{ textAlign: "center", fontWeight: 700, letterSpacing: 1 }}
            gutterBottom
          >
            Contact Us
          </Typography>
          <Box sx={{ width: 80, height: 3, bgcolor: "secondary.main", mx: "auto", mb: 4, borderRadius: 2 }} />

          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Typography variant="h6" sx={{ mb: 1 }}>Saint Jeweller</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Consultations by appointment
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Email: <Link href="mailto:contact@saintjeweller.com">contact@saintjeweller.com</Link>
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Instagram: <Link href="https://www.instagram.com/saintjeweller?igsh=djRoamVlNzFycHlz" target="_blank" rel="noreferrer">@saintjeweller</Link>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tell us about the piece you’re dreaming of, and we’ll craft a personalized consultation.
              </Typography>
            </Grid>
            <Grid item xs={12} md={7}>
              <Box component="form" noValidate autoComplete="off" sx={{ display: "grid", gap: 2 }}>
                <TextField label="Full Name" variant="outlined" required fullWidth />
                <TextField label="Email" type="email" variant="outlined" required fullWidth />
                <TextField label="Message" variant="outlined" multiline minRows={4} fullWidth />
                <Button variant="contained" color="secondary" sx={{ alignSelf: { xs: "stretch", md: "start" } }}>
                  Send Message
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

    

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Saint Jeweller
              </Typography>
              <Typography variant="body2">Luxury Jewellery Boutique</Typography>
              <Typography variant="body2">Instagram: @saintjeweller</Typography>
              <Typography variant="body2">Consultations by appointment</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Quick Links
              </Typography>
              <Link href="#" color="inherit" display="block" sx={{ mb: 1 }}>
                Engagement Rings
              </Link>
              <Link href="#" color="inherit" display="block" sx={{ mb: 1 }}>
                Custom Design
              </Link>
              <Link href="#" color="inherit" display="block" sx={{ mb: 1 }}>
                Visit Our Stores
              </Link>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Follow Us
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <IconButton color="inherit">
                  <Facebook />
                </IconButton>
                <IconButton color="inherit" component="a" href="https://www.instagram.com/saintjeweller?igsh=djRoamVlNzFycHlz" target="_blank" rel="noreferrer">
                  <Instagram />
                </IconButton>
                <IconButton color="inherit">
                  <Twitter />
                </IconButton>
                <IconButton color="inherit">
                  <LinkedIn />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
          <Box
            sx={{ mt: 4, pt: 4, borderTop: "1px solid rgba(255,255,255,0.2)" }}
          >
            <Typography variant="body2" align="center">
              © {new Date().getFullYear()} Saint Jeweller. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}