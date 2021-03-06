/* eslint-disable react/no-danger */

import "isomorphic-fetch";
import React from "react";
import Button from "@material-ui/core/Button";
import Snackbar from "@material-ui/core/Snackbar";
import sleep from "../waterfall/sleep";
import { getCookie } from "../utils/helpers";

function getLastSeenNotification() {
  const seen = getCookie("lastSeenNotification");
  return seen === "" ? 0 : parseInt(seen, 10);
}

let messages = null;

async function getMessages() {
  try {
    if (!messages) {
      await sleep(1500); // Soften the pressure on the main thread.
      const result = await fetch(
        "https://raw.githubusercontent.com/zivelab/zivelab-channels/master/docs/notifications.json"
      );
      messages = await result.json();
    }
  } catch (err) {
    // Swallow the exceptions.
  }

  messages = messages || [];
}

class Banners extends React.Component {
  mounted = false;

  state = {
    open: false,
    message: {}
  };

  async componentDidMount() {
    this.mounted = true;
    await getMessages();
    this.handleMessage();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  handleMessage = () => {
    const lastSeen = getLastSeenNotification();
    const unseenMessages = messages.filter(message => {
      if (message.id <= lastSeen) {
        return false;
      }
      return true;
    });
    if (unseenMessages.length > 0 && this.mounted) {
      this.setState({ message: unseenMessages[0], open: true });
    }
  };

  handleClose = () => {
    this.setState({ open: false });
    document.cookie = `lastSeenNotification=${
      this.state.message.id
    };path=/;max-age=31536000`;
  };

  render() {
    const { message, open } = this.state;

    return (
      <React.Fragment key="section-to-display-banner">
        <Snackbar
          key={message.id}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          ContentProps={{ "aria-describedby": "notification-message" }}
          message={
            <span
              id="notification-message"
              dangerouslySetInnerHTML={{ __html: message.text }}
            />
          }
          action={
            <Button size="small" color="secondary" onClick={this.handleClose}>
              Close
            </Button>
          }
          open={open}
          autoHideDuration={5000}
          onClose={this.handleClose}
          onExited={this.handleMessage}
        />
      </React.Fragment>
    );
  }
}

export default Banners;
