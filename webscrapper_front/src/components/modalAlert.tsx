import { createPortal } from "react-dom";
import styled from "styled-components";
import Icon from "./icon";
import { sectionTheme__css, textTheme__css } from "../styles/CssComponents";
import Button from "./button";
import { useContext } from "react";
import { AlertContext } from "../Context/ContextConfig";

const Alert: React.FC = () => {
  const alert = useContext(AlertContext);

  return (
    <>
      {alert?.showAlert &&
        createPortal(
          <ModalShadow>
            <ModalContent>
              <ModalHeader>
                <h3>{alert?.alertOptions.title}</h3>
                <Icon
                  iconName="Clear"
                  size={24}
                  isButton={true}
                  action={() => {
                    alert.setShowAlert(false);
                  }}
                ></Icon>
              </ModalHeader>
              <ModalBody>
                <AlertMessage>
                  {alert.alertOptions.message}{" "}
                  <Icon iconName="Warning" size={40} customColor="#ffff00" />
                </AlertMessage>
              </ModalBody>
              <ModalFooter>
                <Button
                  action={() => {
                    alert.setShowAlert(false);
                    alert.setAlertOptions({
                      message: "",
                      title: "",
                      type: "error",
                    });
                  }}
                  label="Cancelar"
                ></Button>
                <Button
                  action={() => {
                    alert.setShowAlert(false);
                    alert?.alertOptions?.onConfirm?.();
                    alert.setAlertOptions({
                      message: "",
                      title: "",
                      type: "error",
                    });
                  }}
                  label="Aceptar"
                ></Button>
              </ModalFooter>
            </ModalContent>
          </ModalShadow>,
          document.body,
        )}
    </>
  );
};

const AlertMessage = styled.div`
  display: flex;
  ${textTheme__css}
  align-items: center;
`;


const ModalShadow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #04040454;
  height: 100%;
  width: 100%;
  z-index: 100;
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;

  height: fit-content;
  border-radius: 6px;
  overflow: hidden;
  width: clamp(300px, 90%, 600px);
  /* background-color: red; */
  padding: 0 10px;
  ${sectionTheme__css}

  z-index: 100;
`;

const ModalHeader = styled.div`
  height: 45px;
  width: 100%;
  /* padding: 10px; */
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
  /* background-color: gray; */
  border-bottom: 1px solid #ffffff1a;
  ${textTheme__css}
`;

const ModalBody = styled.div`
  height: fit-content;
  width: 100%;
  padding: 10px 0;
  /* background-color: white; */
`;

const ModalFooter = styled.div`
  border-top: 1px solid #ffffff1a;
  padding: 10px 0;
  height: fit-content;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  gap: 10px;
  /* background-color: white; */
`;

export default Alert;
