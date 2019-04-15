import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

// controls
import Collapse from "@material-ui/core/Collapse";
import Divider from "@material-ui/core/Divider";
import LinearProgress from "@material-ui/core/LinearProgress";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Tooltip from "@material-ui/core/Tooltip";

// Icons
import DashboardIcon from "@material-ui/icons/Dashboard";
import DeviceHubIcon from "@material-ui/icons/DeviceHub";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import HubSpotIcon from "../icons/HubSpot";
import TabletIcon from "@material-ui/icons/Tablet";

// Components
import FabAddDevice from "./FabAddDevice";

// functions
import compose from "../utils/compose";
import { getLocalIPAddress, getFullRange, isZiveDevice } from "../utils/net";
import { timeoutPromise } from "../utils/promise";

// Pages
import GettingStartedPage from "../../pages/GettingStartedPage";
import ChannelPage from "../../pages/DevicePage";
import LinearRegressionPage from "../../pages/LinearRegressionPage";

const gettingStartedKey = "getting-started-nav";
const linearRegressionKey = "linear-regression-nav";

const styles = theme => ({
  nested: {
    paddingLeft: theme.spacing.unit * 4
  }
});

class AppDrawerContents extends React.Component {
  state = {
    selectedKey: gettingStartedKey,

    localIP: null,
    localDevices: [],
    remoteDevices: [],
    knownDevice: "",

    scanDevices: false,
    isLocalScan: false,
    isRemoteScan: false,
    scanCompleted: 0,
    scanTotal: 0,

    openUtilities: false
  };

  handleUtilitiesClick = () => {
    this.setState(state => ({ openUtilities: !state.openUtilities }));
  };

  handleListItemClick = (event, key) => {
    this.setState({ selectedKey: key });
  };

  handleLocalClick = () => {
    this.findDevices(true);
  };

  handleRemoteClick = () => {
    this.findDevices(false);
  };

  handleAddKnownDevice = ip => {
    this.setState({ knownDevice: ip });
    this.scanKnownDevice(ip);
  };

  async scanKnownDevice(ip) {
    await this.loadDescriptionAsync(ip, true);
  }

  async findDevices(isLocal) {
    try {
      const message = isLocal
        ? "Scanning local devices..."
        : "Scanning remote devices...";
      this.props.sendMessage(message);

      if (!isLocal && !this.state.localIP) {
        await this.getLocalIPAddressAsync();
      }
      const baseIP = isLocal ? "169.254.17.1" : this.state.localIP;
      const scanDevices = getFullRange(baseIP, isLocal);
      this.setState({
        isLocalScan: isLocal,
        isRemoteScan: !isLocal,
        scanCompleted: 0,
        scanTotal: scanDevices.length
      });
      scanDevices.map(async ip => {
        await this.loadDescriptionAsync(ip);
      });
    } catch (e) {
      //console.log(e);
    }
  }

  async getLocalIPAddressAsync() {
    try {
      const ip = await getLocalIPAddress();
      if (ip) {
        const knownDevice =
          ip
            .split(".")
            .slice(0, 3)
            .join(".") + ".15";
        this.setState({
          localIP: ip,
          knownDevice: knownDevice
        });
      }
    } catch (e) {
      //console.log(e);
    }
  }

  async loadDescriptionAsync(ip, showMessage = false) {
    // ip should be a valid IP address.
    const isLocal = ip.split(".").slice(0, 1)[0] === "169";
    const devices = isLocal ? "localDevices" : "remoteDevices";
    try {
      // [TODO] We really want to '/description', but we will do later
      const descriptionURL = "http://" + ip + "/about";
      const descriptionRequest = new Request(descriptionURL);
      const descriptionFetch = await timeoutPromise(
        1000,
        fetch(descriptionRequest)
      );
      const descriptionJson = await descriptionFetch.json();
      if (descriptionJson) {
        if (!isZiveDevice(descriptionJson.macAddress)) return;
        const validDevice = {
          name: descriptionJson.hostName || "Untitled",
          model: descriptionJson.model,
          serialNumber: descriptionJson.serialNumber,
          ipAddress: descriptionJson.ipAddress,
          macAddress: descriptionJson.macAddress
        };
        if (
          this.state[devices].filter(device => device.ipAddress === ip)
            .length <= 0
        ) {
          this.setState({
            [devices]: [...this.state[devices], validDevice]
          });
        }
      }
    } catch (e) {
      const invalidDevice = this.state[devices].filter(
        device => device.ipAddress === ip
      );
      this.setState({
        [devices]: this.state[devices].filter(function(device) {
          return device !== invalidDevice;
        })
      });
      if (showMessage) {
        const message =
          "Can't find device. Make sure your device is turned on and connected to the network.";
        this.props.sendMessage(message);
      }
    } finally {
      this.setState({ scanCompleted: this.state.scanCompleted + 1 });
    }
  }

  ScanProgress(disabled = false, value = 0) {
    if (disabled) {
      return <React.Fragment />;
    } else {
      return (
        <React.Fragment>
          <LinearProgress
            variant="determinate"
            value={value}
            color="secondary"
          />
        </React.Fragment>
      );
    }
  }

  RenderDevices(devices) {
    const linkTo = ip => "/device/" + ip;
    const deviceLink = ip => props => <Link to={linkTo(ip)} {...props} />;
    const listKey = ip => {
      return "nav-device-" + ip.split(".").join("-");
    };
    const dividerKey = ip => {
      return "nav-divider-" + ip.split(".").join("-");
    };
    const deviceTitle = device => {
      const name = device.name || "Untitled";
      const model = device.model.startsWith("Zive")
        ? device.model
            .split(" ")
            .slice(1)
            .join(" ")
        : device.model;
      return name === "Untitled" ? model : name;
    };
    const deviceDesc = device => {
      const name = device.name || "Untitled";
      const model = device.model.startsWith("Zive")
        ? device.model
            .split(" ")
            .slice(1)
            .join(" ")
        : device.model;
      const ip = device.ipAddress;
      return name === "Untitled" ? ip : model + " | " + ip;
    };
    if (devices) {
      const sorted = devices.sort(function(a, b) {
        const a_ip = a.ipAddress
          .split(".")
          .map(num => `000${num}`.slice(-3))
          .join("");
        const b_ip = b.ipAddress
          .split(".")
          .map(num => `000${num}`.slice(-3))
          .join("");
        return a_ip - b_ip;
      });
      return sorted.map(device => (
        <React.Fragment key={device.ipAddress}>
          <Divider variant="inset" key={dividerKey(device.ipAddress)} />
          <ListItem
            button
            dense
            key={listKey(device.ipAddress)}
            component={deviceLink(device.ipAddress)}
            selected={this.state.selectedKey === device.ipAddress}
            onClick={event => this.handleListItemClick(event, device.ipAddress)}
          >
            <ListItemIcon>
              <TabletIcon />
            </ListItemIcon>
            <ListItemText
              primary={deviceTitle(device)}
              secondary={deviceDesc(device)}
            />
          </ListItem>
        </React.Fragment>
      ));
    } else {
      return <React.Fragment />;
    }
  }

  channelPage = ({ match: { params } }) => {
    return <ChannelPage ipAddress={params.id} />;
  };

  gettingStartedLink = props => <Link to="/getting-started" {...props} />;

  gettingStartedPage = () => {
    return <GettingStartedPage />;
  };

  linearRegressionLink = props => <Link to="/linear-regression" {...props} />;

  linearRegressionPage = () => {
    return <LinearRegressionPage />;
  };

  componentDidMount = () => {
    this.getLocalIPAddressAsync();
  };

  render() {
    const { classes } = this.props;
    const { selectedKey, knownDevice } = this.state;
    const { localIP, localDevices, remoteDevices } = this.state;
    const { isLocalScan, isRemoteScan, scanCompleted, scanTotal } = this.state;
    const { openUtilities } = this.state;

    // progress in scanning
    const isScanning = scanTotal > 0 && scanCompleted < scanTotal;
    const isLocalScanning = isLocalScan && isScanning;
    const isRemoteScanning = isRemoteScan && isScanning;
    const completed = isScanning ? (scanCompleted * 100) / scanTotal : 0;
    return (
      <React.Fragment key="section-to-list-nav-contents">
        <Divider key="nav-first-divider" />
        <ListItem
          button
          dense
          key={gettingStartedKey}
          component={this.gettingStartedLink}
          selected={selectedKey === gettingStartedKey}
          onClick={event => this.handleListItemClick(event, gettingStartedKey)}
        >
          <ListItemText primary="Getting Started" />
        </ListItem>
        <Divider key="nav-second-divider" />
        <Tooltip
          title={`Click to scan local devices of ${localIP}`}
          aria-label="Click to scan local devices"
          enterDelay={300}
        >
          <ListItem
            button
            dense
            key="nav-local-devices"
            onClick={this.handleLocalClick}
            disabled={isScanning}
          >
            <ListItemIcon>
              <DeviceHubIcon />
            </ListItemIcon>
            <ListItemText
              primary="Scan My Devices"
              secondary={
                isLocalScanning
                  ? "scanning... " + scanCompleted + "/" + scanTotal
                  : localDevices.length
                  ? localDevices.length === 1
                    ? "1 device found"
                    : localDevices.length + " devices found"
                  : "no devices found"
              }
            />
          </ListItem>
        </Tooltip>
        {this.ScanProgress(!isLocalScanning, completed)}
        {this.RenderDevices(localDevices)}
        <Divider key="nav-third-divider" />
        <Tooltip
          title="Click to scan remote devices"
          aria-label="Click to scan remote devices"
          enterDelay={300}
        >
          <ListItem
            button
            dense
            key="nav-remote-devices"
            onClick={this.handleRemoteClick}
            disabled={isScanning}
          >
            <ListItemIcon>
              <HubSpotIcon />
            </ListItemIcon>
            <ListItemText
              primary="Scan Remote Devices"
              secondary={
                isRemoteScanning
                  ? "scanning... " + scanCompleted + "/" + scanTotal
                  : remoteDevices.length
                  ? remoteDevices.length === 1
                    ? "1 device found"
                    : remoteDevices.length + " devices found"
                  : "no devices found"
              }
            />
          </ListItem>
        </Tooltip>
        {this.ScanProgress(!isRemoteScanning, completed)}
        {this.RenderDevices(remoteDevices)}
        <Divider key="nav-end-devices-divider" />
        <ListItem button dense onClick={this.handleUtilitiesClick}>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText inset primary="Utilities" />
          {openUtilities ? (
            <ExpandLess color="action" />
          ) : (
            <ExpandMore color="action" />
          )}
        </ListItem>
        <Collapse in={openUtilities} timeout="auto" unmountOnExit>
          <Divider variant="inset" key="nav-utilities-regression" />
          <List component="div" disablePadding>
            <ListItem
              button
              dense
              className={classes.nested}
              key={linearRegressionKey}
              component={this.linearRegressionLink}
              selected={selectedKey === linearRegressionKey}
              onClick={event =>
                this.handleListItemClick(event, linearRegressionKey)
              }
            >
              <ListItemText primary="Linear Regression" />
            </ListItem>
          </List>
        </Collapse>
        <Divider key="nav-last-divider" />
        <FabAddDevice
          knownDevice={knownDevice}
          onClick={this.handleAddKnownDevice}
          disabled={isScanning}
        />
      </React.Fragment>
    );
  }
}

AppDrawerContents.propTypes = {
  sendMessage: PropTypes.func.isRequired
};

export default compose(
  connect(state => ({
    reduxTitle: state.title
  })),
  withStyles(styles)
)(AppDrawerContents);