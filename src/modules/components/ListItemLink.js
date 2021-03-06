import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { withStyles } from "@material-ui/core/styles";
import { withRouter } from "react-router-dom";
import { Link } from "react-router-dom";

// controls
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

// functions
import compose from "../utils/compose";

const styles = theme => ({
  active: {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightMedium
  }
});

class ListItemLink extends React.Component {
  componentDidMount() {
    // Center the selected item in the list container.
    const activeElement = document.querySelector(
      `.${this.props.classes.active}`
    );
    if (activeElement && activeElement.scrollIntoView) {
      activeElement.scrollIntoView({});
    }
  }

  renderLink = React.forwardRef((itemProps, ref) => (
    <Link to={this.props.to} {...itemProps} ref={ref} />
  ));

  render() {
    const {
      classes,
      icon,
      primary,
      secondary,
      to,
      depth,
      onClick
    } = this.props;
    const active = this.props.location.pathname === to;
    const style = {
      paddingLeft: 8 * depth
    };
    return (
      <ListItem button dense component={this.renderLink} onClick={onClick}>
        {icon && <ListItemIcon>{icon}</ListItemIcon>}
        <ListItemText
          primary={primary}
          secondary={secondary}
          classes={{
            primary: classNames({
              [classes.active]: active
            })
          }}
          style={style}
        />
      </ListItem>
    );
  }
}

ListItemLink.propTypes = {
  classes: PropTypes.object.isRequired,
  icon: PropTypes.element,
  primary: PropTypes.string,
  secondary: PropTypes.string,
  to: PropTypes.string.isRequired,
  depth: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired
};

export default compose(
  withRouter,
  withStyles(styles)
)(ListItemLink);
